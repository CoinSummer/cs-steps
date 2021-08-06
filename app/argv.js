function argvParser(start=2, opts={}) {
    const argMap = opts
    const args = process.argv.splice(start)
    for (let i=0; i<args.length-1; i++) {
        if (args[i].startsWith("--") ) {
            if (args[i+1].startsWith("--")) {
                throw new Error('args struct error.')
            } else {
                argMap[args[i].substr(2)] = args[i+1]
                i += 1
            }
        } else {
            throw new Error('args struct error.')
        }
    }
    return argMap
}

module.exports = { argvParser }