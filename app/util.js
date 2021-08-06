'use strict'


const Web3 = require('web3');
const { isBigNumber, isBN, toWei, fromWei, isAddress } = require('web3-utils')

class Util {
    constructor(url, config) {
        this.url = url || "http://localhost:8545";
        console.log(url)
        if (url.startsWith('ws')) {
            const wsProvider = new Web3.providers.WebsocketProvider(url);
            this.web3 = new Web3(wsProvider)
        } else {
            this.web3 = new Web3(Web3.givenProvider || url)
        }
        
        this.eth = this.web3.eth
        this.config = config
    }

    getWeb3() {
        if (this.web3) {
            return this.web3;
        }
        throw new Error('web3 not initilized')
    }
    
    getEth() {
        if (this.eth) {
            return this.eth;
        }
        throw new Error('eth not initilized')
    }

    getContract(abi, addr, options) {
        const contract = new web3.eth.Contract(abi, addr, options);
        return contract;
    }

    getTokenContractBySym(name) {
        const conractConf = this.config.tokens[name]
        const jsonPath = conractConf.jsonPath // `../truffle/build/contracts/${conractConf.name}`
        const jsonData = require(jsonPath) 
        const contract = new this.eth.Contract(jsonData.abi, conractConf.address, conractConf.options || {});
        return contract;
    }

    // getTokenContractAbi(name) {
    //     const conractConf = this.config.tokens[name]
       
    //     const jsonPath = conractConf.jsonPath  // `../truffle/build/contracts/${conractConf.name}`
    //     const jsonCtx = require(jsonPath)
    //     return jsonCtx.abi;
    // }
}


class ContractWrapper {
    constructor(eth, abi, addr, options={}) {
        this.eth = eth;
        this.abi = abi
        this.address = addr
        this.contract = new eth.Contract(abi, addr, options)
    }

    checkValid(funcNmae, args) {
        if (!Array.isArray(args)) {
            throw new Error(`args must is array`) 
        }

        const methodAbiDefine = this.abi.find(item => { return item.type === 'function' && item.name === funcNmae })
        if (!methodAbiDefine) {
            throw new Error(`Method ${funcName} not in abi`)
        }

        // if (methodAbiDefine.cont)

        if (!methodAbiDefine.inputs && args.length > 0) {
            throw new Error(`Method ${funcName} args ${args} not valid`)
        }

        if (methodAbiDefine.inputs.length != args.length) {
            throw new Error(`Method ${funcName} args count: ${args} not mtach abi define, abi: ${JSON.stringify(methodAbiDefine.inputs)}`)
        }

        for (const i in methodAbiDefine.inputs) {
            const input = methodAbiDefine.inputs
            const value = args[i]
            if(input.type === 'address' && !isAddress(value)) {      
                throw new Error(`Method ${funcName} args[${input.name}] must is address, get ${value}`)
            }
        }    
    }
    
    methodCall(funcName, args) {
        this.checkValid(funcName, args)
        return this.contract.methods[funcName](...args).call()
    }
  
    methodEncode(funcName, args, value='0x00', options={}) {
        this.checkValid(funcName, args)
        return {
            to: this.contract.options.address,
            value,
            data: this.contract.methods[funcName](...args).encodeABI(), 
            ...options
        }
    }

    funcEncode(funcName, args) {
        return this.contract.methods[funcName](...args).encodeABI()
    }
}

function toHexAddr(addr) {
    return addr.startsWith('0x') ? addr.toLowerCase() : `0x${addr.toLowerCase()}`
}

function toWei1(value, unit) {
    const units = ['ether', 'gwei', 'mwei', 'kwei', 'wei']
    if (units.includes(unit)) {
        return toWei(String(value), unit)
    } else if (unit === 'm8wei') {
        return toWei(String(value), 'mwei') + '00'
    }
}

function fromWei1(value, unit) {
    const units = ['ether', 'gwei', 'mwei', 'kwei', 'wei']
    if (units.includes(unit)) {
        return fromWei(String(value), unit)
    } else if (unit === 'm8wei') {
        return String(parseFloat(fromWei(String(value), 'mwei') / 100))
    }
}

function loadContractWrapper(eth, addr, jsonPath) {
    const JsonData = require(jsonPath)
    return new ContractWrapper(eth, JsonData.abi, addr)
}

module.exports = { 
    Util, 
    toHexAddr,
    toWei1,
    fromWei1,
    ContractWrapper, 
    loadContractWrapper,
    Gwei: 1000000000
}