'use strict'

module.exports = (app) => {
    const configFunc = require(`./${app.mode}.js`)
    return configFunc(app)
}