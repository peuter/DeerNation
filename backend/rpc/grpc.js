/**
 * grpc
 *
 * @author Tobias Bräutigam <tbraeutigam@gmail.com>
 * @since 2018
 */
const logger = require('../logger')(__filename)

class GrpcServer {
  constructor () {
    this.socket = null
    this._services = {}
  }

  upgradeToGrpc (socket) {
    this.socket = socket
    // socket.on('raw', request => {
    //   try {
    //     request = JSON.parse(request)
    //     console.log(event)
    //   } catch (ex) {
    //     return;
    //   }
    //   if (schemas.isValid(request, schemas.WAMPRequestSchema)) {
    //     this.processWAMPRequest(request, socket);
    //   } else {
    //
    //   }
    // });
  }

  addService (service, methods) {
    Object.keys(service.service).forEach(name => {
      const rpc = service.service[name]
      if (methods.hasOwnProperty(name)) {
        logger.debug('registering service endpoint ' + name)
        this._services[rpc.path] = Object.assign({callback: methods[name]}, rpc)
        this.socket.on(service.service[name].path, this._onRequest.bind(this, service.service[name].path))
      } else {
        logger.error('no callback defined for service endpoint ' + name)
      }
    })
  }

  /**
   * Handle incoming gRPC requests
   * @param path {String} gRPC path
   * @param data {Map} Uint8Array as plain Javascript object
   * @param response {Function} response callback function
   * @protected
   */
  async _onRequest (path, data, response) {
    const service = this._services[path]
    const bytes = Uint8Array.from(Object.values(data))
    console.log('executing ' + path)
    const result = await service.callback(this.socket.getAuthToken(), service.requestDeserialize(bytes))
    response(null, service.responseSerialize(result))
  }
}

const grpcServer = new GrpcServer()

module.exports = grpcServer