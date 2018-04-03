/* DeerNation community project
 *
 * copyright (c) 2017-2018, Tobias Braeutigam.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 */

/**
 * acl
 *
 * @author Tobias Bräutigam <tbraeutigam@gmail.com>
 * @since 2018
 */
const schema = require('./model/schema')
const i18n = require('i18n')
const logger = require('./logger')(__filename)

class AclException extends Error {
}

const action = {
  CREATE: 'c',
  READ: 'r',
  UPDATE: 'u',
  DELETE: 'd',
  EXECUTE: 'x',
  ENTER: 'e',
  LEAVE: 'l',
  PUBLISH: 'p'
}

module.exports = {
  action: action,
  __cache: {},

  /**
   * Returns all allowed actions for this user in a map with the keys:
   * {
   *  actions: ...,
   *  memberActions: ...
   *  ownerActions: ...
   * }
   *
   * @param userId {String?} User whoms ACLs should be returned, if empty the guest users ACLs will be returned
   * @param topic {String} topic to check
   * @returns {Promise<Map>}
   */
  getEntries: async function (userId, topic, role) {
    let cacheId
    if (role) {
      cacheId = role + topic
    } else {
      cacheId = (userId || '*') + topic
    }
    if (this.__cache.hasOwnProperty(cacheId)) {
      return this.__cache[cacheId]
    }
    const r = schema.getR()

    let aclEntries, acl
    if (role) {
      aclEntries = await schema.getModel('ACLEntry').filter(entry => {
        return entry('targetType').eq('role')
          .and(entry('target').eq(role))
          .and(r.expr(topic).match(entry('topic')))
      }).run()
    } else {
      // get roles for user
      let roles = ['guest']
      if (userId) {
        // get the actors main role
        const mainRole = await schema.getModel('Actor').get(userId).run()
        roles.push(mainRole.role)

        // get all other roles the actor is associated to
        const userRoles = await schema.getModel('ACLRole').filter(role => {
          return role('members').contains(userId).and(role('id').eq(mainRole.role).not())
        }).orderBy(r.asc('weight')).run()
        userRoles.forEach(userRole => {
          roles.push(userRole.id)
        })
      }
      if (roles.includes('admin')) {
        const all = Object.values(action).join('')
        acl = {
          actions: all,
          memberActions: all,
          ownerActions: all
        }
        this.__cache[cacheId] = acl
        return acl
      }
      logger.debug('Roles: %s, Topic: %s, CacheID: %s', roles, topic, cacheId)
      aclEntries = await schema.getModel('ACLEntry').filter(entry => {
        return entry('targetType').eq('role')
          .and(r.expr(roles).contains(entry('target')))
          .and(r.expr(topic).match(entry('topic')))
      }).run()
    }
    logger.debug('found ACL entries: %o', aclEntries)

    acl = {
      actions: '',
      memberActions: '',
      ownerActions: ''
    }
    // merge entries by role-weight
    aclEntries.forEach(entry => {
      this.__mergeAcls(acl, entry)
    })
    this.__cache[cacheId] = acl
    return acl
  },

  __mergeAcls: function (acl, newAcl) {
    const props = ['actions', 'memberActions', 'ownerActions']
    props.forEach(actions => {
      if (newAcl.hasOwnProperty(actions)) {
        if (!acl.hasOwnProperty(actions)) {
          acl[actions] = ''
        }
        for (let i = 0, l = newAcl[actions].length; i < l; i++) {
          let action = newAcl[actions].charAt(i)
          if (action === '-') {
            // remove this action
            i++
            action = newAcl[actions].charAt(i)
            if (acl[actions].includes(action)) {
              acl[actions].replace(action, '')
            }
          } else if (!acl[actions].includes(action)) {
            // add this action
            acl[actions] += action
          }
        }
      }
    })
  },

  /**
   * Clear the cached ACLEntries
   * @param userId {String?} userID whoms ACLEntry-Cache should be cleared, in undefined all caches are cleared
   */
  clearCache: function (userId) {
    if (userId) {
      delete this.__cache[userId]
    } else {
      Object.keys(this.__cache).forEach(prop => {
        delete this.__cache[prop]
      })
    }
  },

  /**
   * Checks if the user can execute the action on that topic, otherwise an AclException is thrown
   *
   * @param authToken {Object?} auth token of the current user
   * @param token {String} topic to check
   * @param actions {String} a combination of acl.CREATE, acl.READ, ...
   * @param actionType {String} type of actions to check (null, member, owner)
   * @param exceptionText {String?} optional text if the check fails
   * @returns {boolean} true if the check succeeds
   * @throws {AclException} if the check fails
   */
  check: async function (authToken, token, actions, actionType, exceptionText) {
    logger.debug('check %s for %s', actions, token)
    const allowed = await this.getAllowedActions(authToken, token)
    if (!exceptionText) {
      exceptionText = i18n.__('You do not have the rights to do this.')
    }
    if (!allowed) {
      throw new AclException(exceptionText)
    } else {
      let allowedActions = ''
      switch (actionType || 'actions') {
        case 'actions':
          allowedActions = allowed.actions
          break

        case 'member':
          allowedActions = allowed.memberActions
          break

        case 'owner':
          allowedActions = allowed.ownerActions
          break
      }
      if (!allowedActions) {
        throw new AclException(exceptionText)
      }
      logger.debug('Allowed actions for %s: %s', token, allowedActions)

      for (let i = 0, l = actions.length; i < l; i++) {
        if (!allowedActions.includes(actions.charAt(i))) {
          throw new AclException(exceptionText)
        }
      }
    }
  },

  /**
   * Returns a concatenated string with all allowed actions on the topic
   * @param authToken {Object?} auth token of the current user
   * @param topic {String} topic to check
   * @returns {Promise<string>} concatenated allowed actions
   */
  getAllowedActions: function (authToken, topic) {
    return this.getEntries(authToken && authToken.user, topic)
  },

  /**
   * Returns concatenated string with all allowed actions for the given role on the topic
   * @param authToken {Object?} only for compability reasons with rpc calls, not used here
   * @param role {String} Role to check
   * @param topic {String} topic to check
   * @returns {*|Promise<Map>}
   */
  getAllowedActionsForRole: function (authToken, role, topic) {
    return this.getEntries(null, topic, role)
  },

  AclException: AclException
}
