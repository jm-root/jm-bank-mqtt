var Promise = require('bluebird')
var log = require('jm-log4js')
var mqtt = require('mqtt')
var logger = log.getLogger('jm-bank-mqtt')

module.exports = function (opts, app) {

  ['mqtt'].forEach(function (key) {
    process.env[key] && (opts[key] = process.env[key])
  })

  var o = {
    ready: false,

    onReady: function () {
      var self = this
      return new Promise(function (resolve, reject) {
        if (self.ready) return resolve(self.ready)
        self.on('ready', function () {
          resolve()
        })
      })
    }
  }

  if (!app.modules.bank) {
    logger.warn('no bank module found. so I can not work.')
    return o
  }
  if (!opts.mqtt) {
    logger.warn('no config mqtt. so I can not work.')
    return o
  }

  var bank = app.modules.bank

  var mq = mqtt.connect(opts.mqtt)

  mq.on('connect', function (connack) {
    logger.info('connected')
    o.ready = true
  })
  mq.on('reconnect', function () {
    logger.info('reconnect')
  })
  mq.on('close', function () {
    logger.info('close')
    o.ready = false
  })
  mq.on('offline', function () {
    logger.info('offline')
    o.ready = false
  })
  mq.on('error', function (err) {
    logger.error(err.stack)
  })

  var publish = function (channel, obj) {
    o.onReady()
      .then(function () {
        mq.publish(channel, JSON.stringify(obj), {qos: 1})
      })
  }
  bank.on('user.create', function (opts) {
    opts && (publish('bank/user/create', opts))
  })
  bank.on('updateAmount', function (opts) {
    opts && (publish('bank/updateAmount', opts))
  })
  bank.on('transfer', function (opts) {
    opts && (publish('bank/transfer', opts))
  })
}
