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
 * RPC registry that hold all registered RPCs
 *
 * @author tobiasb
 * @since 2018
 */
const WAMPServer = require('wamp-socket-cluster/WAMPServer')
const dbModule = require('./db')
const acl = require('../acl')
const config = require('../config')
const path = require('path')
const PROTO_PATH = path.join(__dirname, '/../../protos/api.proto')
const grpc = require('grpc')
const dn = grpc.load(PROTO_PATH).dn
const grpcServer = require('./grpc')

class RpcServer {
  constructor () {
    this.rpcServer = new WAMPServer()
    this.registerRPCEndpoints(dbModule)
    this.socket = null
  }

  upgradeToWAMP (socket) {
    this.socket = socket
    this.rpcServer.upgradeToWAMP(socket)
    grpcServer.upgradeToGrpc(socket)

    grpcServer.addService(dn.Com, {
      getActivities: dbModule.getActivities
    })
  }

  registerRPCEndpoints (endpoints) {
    let wrappedEndpoints = {}
    Object.keys(endpoints).forEach(methodName => {
      const entry = endpoints[methodName]
      let context = this
      let func = entry
      if (typeof entry === 'object') {
        if (entry.hasOwnProperty('context')) {
          context = entry.context
          func = entry.func
        }
      }
      wrappedEndpoints[methodName] = this._wrapper.bind(this, func, context)
    })
    this.rpcServer.registerRPCEndpoints(wrappedEndpoints)
  }

  async _wrapper (func, context, data, callback) {
    try {
      // ACL check
      await acl.check(this.socket.getAuthToken(), config.domain + '.rpc.' + func.name.replace('bound ', ''), acl.action.EXECUTE)
      if (data) {
        data.unshift(this.socket.getAuthToken())
      } else {
        data = [this.socket.getAuthToken()]
      }
      let res = func.apply(context, data)
      Promise.resolve(res).then(pres => {
        callback(null, pres)
      })
    } catch (e) {
      callback(e.toString())
    }
  }
}

const rpcServer = new RpcServer()

rpcServer.registerRPCEndpoints({
  getAllowedActions: acl.getAllowedActions.bind(acl),
  check: acl.check.bind(acl),
  getAllowedActionsForRole: acl.getAllowedActionsForRole.bind(acl)
})

module.exports = rpcServer
