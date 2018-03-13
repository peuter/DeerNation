const SCWorker = require('socketcluster/scworker')
const express = require('express')
const bodyParser = require('body-parser')
const serveStatic = require('serve-static')
const path = require('path')
const healthChecker = require('sc-framework-health-check')
const schema = require('./backend/model/schema')
const auth = require('./backend/auth')
const i18n = require('i18n')
const ICal = require('./backend/crawler/iCal')
const cron = require('node-cron')
const logger = require('./backend/logger')(__filename)
const WebhookHandler = require('./backend/webhook/handler')
const channelHandler = require('./backend/ChannelHandler')
const rpcServer = require('./backend/rpc')
const pushNotifications = require('./backend/notification')
const graphqlThinky = require('./backend/model/graphql-thinky')
const graphqlHTTP = require('express-graphql')
// const scCodecMinBin = require('sc-codec-min-bin')

class Worker extends SCWorker {
  run () {
    logger.info('   >> Worker PID: %d', process.pid)
    let environment = this.options.environment
    const serverId = this.options.serverId
    console.log('ServerId:', serverId)

    let app = express()

    i18n.configure({
      locales: ['en', 'de'],
      directory: path.join(__dirname, 'locales')
    })

    // default: using 'accept-language' header to guess language settings
    app.use(i18n.init)

    let httpServer = this.httpServer
    let scServer = this.scServer
    // scServer.setCodecEngine(scCodecMinBin)

    channelHandler.init(this.scServer)

    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      // app.use(morgan('dev'));
      logger.debug('serving static frontend/app/source-output')
      app.use(serveStatic(path.resolve(__dirname, 'frontend/app/source-output')))
    } else {
      logger.debug('serving static frontend/app/build-output')
      app.use(serveStatic(path.resolve(__dirname, 'frontend/app/build-output')))
    }

    app.use(bodyParser.json())

    // Create/Update RethinkDB schema
    let crud = schema.create(this)

    graphqlThinky.init(crud.thinky)
    if (environment === 'dev') {
      app.use('/graphql', graphqlHTTP(async (request, response, graphQLParams) => {
        const startTime = Date.now()
        return {
          schema: graphqlThinky.getSchema(),
          context: {
            loaders: graphqlThinky.getModelLoaders()
          },
          graphiql: true,
          pretty: true,
          formatError: error => ({
            message: error.message,
            locations: error.locations,
            stack: error.stack ? error.stack.split('\n') : [],
            path: error.path
          }),
          extensions ({document, variables, operationName, result}) {
            return {runTime: Date.now() - startTime}
          }
        }
      }))
    }

    // activate Webhookhandler
    const webhookHandler = new WebhookHandler()
    webhookHandler.init(app, scServer)

    // Add GET /health-check express route
    healthChecker.attach(this, app)

    httpServer.on('request', app)

    let iCal = new ICal(environment === 'dev' ? 'index.ics' : 'https://www.hirschberg-sauerland.de/index.php?id=373&type=150&L=0&tx_cal_controller%5Bcalendar%5D=1&tx_cal_controller%5Bview%5D=ics&cHash=b1aa5a58b6552eaba4eae2551f8d6d75', crud.models)
    logger.debug('Installing iCal importer cronjob')
    cron.schedule('0 0 * * * *', iCal.update.bind(iCal), true)

    // start listening on changes to Activities
    channelHandler.start()

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function (socket) {
      // activate authentification
      if (socket.authToken) {
        auth(socket, scServer)
        pushNotifications.syncTopicSubscriptions(socket.authToken.user, serverId)
      } else {
        auth(socket, scServer, pushNotifications.syncTopicSubscriptions.bind(pushNotifications, serverId))
      }

      rpcServer.upgradeToWAMP(socket)

      graphqlThinky.attach(socket)

      // socket.on('disconnect', function () {
      //
      // })
    })
  }
}

// eslint-disable-next-line
new Worker()
