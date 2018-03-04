/**
 * db
 *
 * @author tobiasb
 * @since 2018
 */

const schema = require('../model/schema')
const acl = require('../acl')
const i18n = require('i18n')
const config = require('../config')
const logger = require('../logger')(__filename)

function getSubscriptions (authToken) {
  return schema.getModel('Subscription').filter({actorId: authToken.user}).run()
}

/**
 * Return all channels the current user is subscribed to + the public ones
 * @param authToken
 */
async function getChannels (authToken) {
  await acl.check(authToken, config.channelPrefix + '.+.public', acl.action.READ)
  if (!authToken) {
    return schema.getModel('Channel').filter({type: 'PUBLIC'}).run()
  } else {
    const r = schema.getR()
    let filter = r.row('right')('type').eq('PUBLIC').or(r.row('right')('ownerId').eq(authToken.user))
    return r.table('Subscription').eqJoin('channelId', r.table('Channel')).filter(filter).map(function (entry) {
      return entry('right')
    }).distinct().run()
  }
}

async function getChannelActivities (authToken, channel, from) {
  await acl.check(authToken, channel, acl.action.READ)
  const r = schema.getR()
  let filter = r.row('channelId').eq(channel).and(r.row.hasFields('actorId'))
  if (from) {
    filter.and(r.row('published').ge(from))
  }
  return schema.getModel('Activity').filter(filter).orderBy(r.asc('published')).run()
}

async function getActors (authToken) {
  await acl.check(authToken, config.domain + '.object.Actor', acl.action.READ)
  return schema.getModel('Actor').pluck('id', 'name', 'username', 'type', 'role', 'online', 'status', 'color').run()
}

async function createChannel (authToken, channelData) {
  const channelId = config.channelPrefix + channelData.name.toLowerCase() + (channelData.private ? '.private' : '.public')
  await acl.check(authToken, channelId, acl.action.CREATE, 'actions', i18n.__('You are not allowed to create this channel.'))
  const crud = schema.getCrud()
  return new Promise((resolve, reject) => {
    crud.create({
      type: 'Channel',
      value: {
        id: channelId,
        title: channelData.name,
        type: channelData.private ? 'PRIVATE' : 'PUBLIC',
        ownerId: authToken.user
      }
    }, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  }).then(() => {
    return new Promise((resolve, reject) => {
      crud.create({
        type: 'Subscription',
        value: {
          channelId: channelId,
          actorId: authToken.user
        }
      }, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  })
}

async function getObject (authToken, type, id) {
  await acl.check(authToken, config.domain + '.object.' + type, acl.action.READ, null, i18n.__('You are not allowed to read this item.'))

  return schema.getModel(type).get(id).run()
}

async function updateObjectProperty (authToken, type, id, prop, value) {
  const currentObject = await schema.getModel(type).get(id).run()
  if (!currentObject) {
    // nothing found that could be updates
    throw new Error(i18n.__('Object not found'))
  }
  let actionType = 'actions'
  if (currentObject.hasOwnProperty('ownerId') && currentObject.ownerId === authToken.user) {
    actionType = 'owner'
  }
  await acl.check(authToken, config.domain + '.object.' + type, acl.action.UPDATE, actionType, i18n.__('You are not allowed to update property %s of this item.', prop))

  const crud = schema.getCrud()
  let update = {
    type: type,
    id: id
  }
  if (!value) {
    // update all object values with the current values (aka do not overwrite nested objects, only update them)
    Object.keys(prop).forEach(key => {
      if (typeof prop[key] === 'object') {
        prop[key] = Object.assign(currentObject[key], prop[key])
      }
    })
    update.value = prop
  } else if (prop.indexOf('.') >= 0) {
    // nested property
    delete update.field
    let parts = prop.split('.')
    let part = parts.shift()
    update.value = {}
    update.value[part] = {}
    let pointer = update.value[part]
    while (parts.length > 0) {
      part = parts.shift()
      if (parts.length === 0) {
        pointer[part] = value
      } else {
        pointer = pointer[part]
      }
    }
  } else {
    update.field = prop
    update.value = value
  }
  return new Promise((resolve, reject) => {
    crud.update(update, (err, res) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        console.log(res)
        resolve(res)
      }
    })
  })
}

async function setFirebaseToken (authToken, firebaseToken, oldToken) {
  await acl.check(authToken, config.domain + '.object.firebase', acl.action.UPDATE, null, i18n.__('You are not allowed to save this token.'))
  const crud = schema.getCrud()

  if (oldToken) {
    // delete old token
    schema.getModel('Firebase').filter({token: oldToken}).delete()
  }

  if (firebaseToken) {
    return schema.getModel('Firebase').filter({token: firebaseToken}).run()
      .then((res) => {
        if (res && res.length > 0) {
          return new Promise((resolve, reject) => {
            crud.update({
              type: 'Firebase',
              id: res[0].id,
              value: {
                token: firebaseToken,
                actorId: authToken.user
              }
            }, (err, res) => {
              if (err) {
                reject(err)
              } else {
                resolve(res)
              }
            })
          })
        } else {
          return new Promise((resolve, reject) => {
            crud.create({
              type: 'Firebase',
              value: {
                actorId: authToken.user,
                token: firebaseToken
              }
            }, (err, res) => {
              if (err) {
                reject(err)
              } else {
                resolve(res)
              }
            })
          })
        }
      })
      .catch(() => {
        return new Promise((resolve, reject) => {
          crud.create({
            type: 'Firebase',
            value: {
              actorId: authToken.user,
              token: firebaseToken
            }
          }, (err, res) => {
            if (err) {
              reject(err)
            } else {
              resolve(res)
            }
          })
        })
      })
  }
}

async function deleteActivity (authToken, id) {
  // message specific check
  const activity = await schema.getModel('Activity').get(id).run()
  if (!activity) {
    // we cannot delete what does not exist
    return true
  }
  let actionType = activity.actorId === authToken.user ? 'owner' : 'actions'
  try {
    await acl.check(authToken, config.domain + '.object.activity', acl.action.DELETE, actionType, i18n.__('You are not allowed to delete this activity.'))
    activity.delete()
    return true
  } catch (e) {
    // check if user is channel owner
    const subs = await schema.getModel('Subscription').filter({
      channelId: activity.channelId,
      actorId: authToken.user
    }).run()
    if (subs.length === 1) {
      if (subs[0].actorId === authToken.user) {
        // user is owner of this channel
        activity.delete()
        return true
      }
    }
    throw e
  }
}

module.exports = {
  getChannels: getChannels,
  getSubscriptions: getSubscriptions,
  getChannelActivities: getChannelActivities,
  getActors: getActors,
  createChannel: createChannel,
  getObject: getObject,
  updateObjectProperty: updateObjectProperty,
  setFirebaseToken: setFirebaseToken,
  deleteActivity: deleteActivity
}
