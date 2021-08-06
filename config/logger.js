var log4js = require('log4js');

const maxFileSize = 1024 * 1024 * 10 // 10M

module.exports = (app) => {
    const level = 'debug'  // app.mode === 'dev' ? 'debug' : 'info'
    appenders = ['out', 'all', 'errorFilter']
    // app.mode === 'dev' && appenders.unshift('out')
    const logOpts = {
        appenders: {
            out: { type: 'stdout' },
            console: { type: 'console' },
            error: { 
                type: 'file', 
                filename: app.homeDir + '/logs/error.log', 
                maxLogSize: maxFileSize, 
                backups: 3, 
                compress: true 
            },
            errorFilter: { 
                type: 'logLevelFilter', 
                appender: 'error', 
                level: 'error' 
            },
            all: { 
                type: 'file', 
                filename: app.homeDir + '/logs/app.log', 
                maxLogSize: maxFileSize, 
                backups: 7, 
                compress: true 
            }
        },
        categories: {
            default: { appenders, level },
        }
    }

    log4js.configure(logOpts)
}