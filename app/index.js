'use strict'

const BN = require('bignumber.js')

const { getAccountFromCache, addAccountToCache, Account } = require('./account')
const { StandardToken } = require('./token')
const { ContractWrapper, Gwei } = require('./util')
const { keccak256 } = require('web3-utils')

const log4js = require('log4js');
const logger = log4js.getLogger();


class EventHub {
    constructor(_plugins=[]) {
        this.plugins = _plugins
        this.eventEnable = false
    }

    createId() {
        const rand = parseInt(Math.random() * 1000)
        const now = Date.now()
        return `${now}${rand}`
    }

    event(data, tags, ts=Date.now()) {
        if (!this.eventEnable) { return }

        const id = tags.msgId ? tags.msgId : this.createId()
        logger.info(data, tags, id, ts)
        this.plugins.forEach(p => {
            try {
                p.event(data, tags, id, ts)
            } catch(e) {
                logger.error(e)
            }
        })
    }

    addPlugin(_plugin) {
        if (!_plugin.name) {
            throw new Error('name of plugin undefined')
        }
        logger.info(`add plugin ${_plugin.name}`)
        this.plugins.push(_plugin)
        this.eventEnable = true
    }

    async start() {}

    async stop() {}
}

class App extends EventHub {
    constructor(util, config) {
        super({})
        this.util = util
        this.eth = util.getEth();
        this.web3 = util.getWeb3();
        this.config = config

        this.mode = 'CMD'

        this.tokens = {}

        this.inputPlugin = null
    }

    async getNonce(account) {
        const n = await this.eth.getTransactionCount(account.addr)
        const nouce =  account.nonce > n ? account.nonce : n
        account.nonce = nouce + 1
        return nouce
    }

    async sendTransaction(signedTxHex, tags={}) {
        if (String(process.env.SUBMIT).toUpperCase() !== "YES" && String(process.env.SUBMIT).toUpperCase() !== "Y") {
            return
        }

        const that = this
        this.eth.sendSignedTransaction(signedTxHex)
        .on('transactionHash', hash => {
            if (that.eventEnable) that.event({ hash }, { ...tags, name: "sendTransaction", state: 'HASH' })
            tags.hash = hash

            logger.info(`****====Transaction Submitted:`, hash)
        })
        .on('receipt', receipt => {
            if (that.eventEnable) that.event({ receipt }, { ...tags, name: "sendTransaction", state: 'RECEIPT' })

            logger.info(`****====Transaction Responed:`, 'status=', receipt.status, 'gasUsed=', receipt.gasUsed, 'hash=', transactionHash)
        })
        .on('confirmation', (confirmationNumber, receipt) => {
            if (that.eventEnable) that.event({ confirmationNumber }, { ...tags, name: "sendTransaction", state: 'CONFIRMATION' })
            if (confirmationNumber <= 6) logger.info(`****====Transaction Confirmed:`, confirmationNumber)
        })
        .on('error', err => {
            if (that.eventEnable) that.event({ error: err.message }, { ...tags, name: "sendTransaction", state: 'ERROR' })

            logger.error(`****====Transaction Failed:`, err)
        });
    }

    async getTxReceipt(txid) {
        const receipt = await this.eth.getTransactionReceipt(txid)
        return receipt
    }

    async transfer(from, to, value, options={}) {
        const msgId = options.eventId || this.createId()
        let tags = { name: 'transfer', state: 'CREATE', msgId }
        this.event({ from, to, value, options }, tags)

        try {
            const AccountFrom = await this.loadAccount(from)

            // * step1 获取Current Account Balance
            AccountFrom.ethBalanceWei = await this.eth.getBalance(from)
            const ethBalance = this.web3.utils.fromWei(AccountFrom.ethBalanceWei)
            logger.info(`Current Account${from} ETH Balance eth: ${ethBalance}  wei: ${AccountFrom.ethBalanceWei}`)

            if (BN(AccountFrom.ethBalanceWei).comparedTo(BN(value)) < 1) {
                const errMsg = `Current Account[${from}]ETH Balance low:[eth=${ethBalance}, wei=${AccountFrom.ethBalanceWei}] lt ${value}`
                this.event({ erorr: errMsg }, { ...tags, state: 'ERROR' })
                throw new Error(errMsg)
            }

            let gasPrice = options.gasPrice ? new BN(options.gasPrice) : new BN(this.config.gasPrice * Gwei)

            const gasNeed = BN(gasPrice * 21000)
            logger.info('gasNeed', gasNeed)

            if (BN(AccountFrom.ethBalanceWei).comparedTo(BN(value).add(BN(gasNeed))) < 0) {
                const errMsg = `Current Account[${from}]ETH Balance low:[${ethBalance}Ether, ${AccountFrom.ethBalanceWei}Wei] lt ${BN(value).add(BN(gasNeed)).toString()}`
                this.event({ erorr: errMsg }, { ...tags, state: 'ERROR' })
                throw new Error(errMsg)
            }

            // * step2
            const nonce = await this.getNonce(AccountFrom)
            logger.info(`${from} nonce`, nonce)
            this.event({ nonce }, { ...tags, state: 'NONCE' })

            const rawTx = AccountFrom.transfer(to, value, { gasPrice, nonce })
            // const gas = await this.eth.estimateGas(rawTx)
            rawTx.gas = options.gas || 22000

            this.event({ raw: rawTx }, { ...tags, state: 'TX_RAW' })

            const signedTxHex = await AccountFrom.signTxHex(rawTx)
            const txid = keccak256(signedTxHex)
            console.log(signedTxHex, 'txid=', txid)
            await this.sendTransaction(signedTxHex, tags)
        } catch (e) {
            logger.error(e)
            this.event(action, 'ERROR', Date.now(), mid, Object.assign({ data }, { error: e.message }))
        }

    }

    async cancel(from, nonce, options={}) {
        try {
            const AccountFrom = await this.loadAccount(from)

            let gasPrice = options.gasPrice ? new BN(options.gasPrice) : new BN(this.config.gasPrice * Gwei)

            const rawTx = {
                from,
                to: '0xa157bf6ae11eed1309a2d4d0c6ac76e15aa66426',
                value: '0x',
                nonce,
                data: '0x',
                gasPrice,
                gas: 22000
            }
            rawTx.gas = 22000

            const signedTxHex = await AccountFrom.signTxHex(rawTx)
            await this.sendTransaction(signedTxHex, {})
        } catch (e) {
            logger.error(e)
        }
    }

    async loadAccount(_addr) {
        let addr = String(_addr).toLowerCase()
        let account = getAccountFromCache(addr)
        if (!account) {
            // const aconfig = this.config.accounts.find(ac => { return String(ac.address).toLowerCase() === addr })

            const pwd = this.pwd ? this.pwd : process.env.PASSWORD ? process.env.PASSWORD : process.env.PWD 

            account = new Account(this.eth, addr)
            await account.decryptAccountFile(pwd, process.env.ENV)

            addAccountToCache(account)
        }

        return account
    }

    async loadAccounts(balanceNeed=false) {
        const accounts = this.config.accounts.map((item) => {
            return {
                id: item.address,
                address: item.address,
                name: item.name,
                enable: item.enable
            }
        })
        if (!balanceNeed) { return accounts }

        const items = []
        for (const item of accounts){
            const ethWei = await this.eth.getBalance(item.address)
            const eth = this.web3.utils.fromWei(ethAmountWei)

            const n = { ...item, ethWei, eth }
            items.push(n)
        }
        return items
    }

    // load configed Token
    loadToken(tokenSym) {
        // const tokenOpts = this.config.tokens
        const confi = this.config.tokens[tokenSym]
        const jsonData = require(confi.jsonPath)
        const token = new StandardToken(this.eth, jsonData.abi, confi.address, confi)
        this.tokens[tokenSym] = token
        return token
    }

    loadTokens() {
        // const tokenOpts = this.config.tokens
        for(const confi of this.config.tokens) {
            const jsonData = require(confi.jsonPath)
            const token = new StandardToken(this.eth, jsonData.abi, confi.address, confi)
            this.tokens[tokenSym] = token
        }
    }

    loadContract(key) {
        const confi = this.config.contracts[key] || this.config.tokens[key]
        const jsonData = require(confi.jsonPath)
        const cwapper = new ContractWrapper(this.eth, jsonData.abi, confi.address, {})

        return cwapper
    }

    abiInfo(key) {
        const confi = this.config.contracts[key] || this.config.tokens[key]
        if (!confi) { throw new Error('not find') }
        const jsonData = require(confi.jsonPath)
        const abiarr = jsonData.abi
        // console.log(abiarr)
        return abiarr.map(item => {
            let info = ''
            if (item.inputs) item.inputs.map(input => {
                info += `${input.type} ${input.name}, `
                return input
            })
            item.description =`${item.name}(${info})` // Method
            item.tag = item.stateMutability === 'view' ? "view" : "transaction"
            return item
        }).filter(item => { return item.type === "function" })
    }

}

class ContractApp extends App {
    constructor(util, config) {
        super(util, config)
        this.contractWrapper = null
    }

    setContractWrapper(wrapper) {
        this.contractWrapper = wrapper
    }

    setAddress(address) {
        this.address = address
    }

    async methodCall(funcname, args) {
        try {
            if (this.contractWrapper[funcname]) {
                return await  this.contractWrapper[funcname](...args)
            } else {
                return await this.contractWrapper.methodCall(funcname, args)
            }
        } catch (e) {
            logger.error(e)
        }
    }

    async methodSend(funcname, args, address, options={}) {
        const that = this

        try {
            logger.info(`ContractApp.methodSend ${funcname}(${args})` ,options)
            const account = await this.loadAccount(address)

            // * step3 nonce
            const nonce = options.nonce ? options.nonce : await this.getNonce(account)
            logger.info("ContractApp.methodSend nonce", nonce)

            let gasPrice = options.gasPrice ? new BN(options.gasPrice) : new BN(this.config.gasPrice * Gwei)

            const value = options.value ? options.value : '0x00'
            const rawTx = this.contractWrapper[funcname]
                ? await this.contractWrapper[funcname](...args)
                : await this.contractWrapper.methodEncode(funcname, args, value, { gasPrice, nonce })

            rawTx.gas = options.gas || 200000
            // try {
            //     const gas = await this.eth.estimateGas(rawTx)
            //     logger.info(`ContractApp.methodSend estimateGas gas=${gas}`)
            //     rawTx.gas = parseInt(gas * 1.5)
            // } catch(e) {
            //     logger.warn(`ContractApp.methodSend Estimated Gas Limit Fail, using gas=${options.gas || 200000}`)
            // }

            const signedTxHex = await account.signTxHex(rawTx)
            const txid = keccak256(signedTxHex)
            logger.info("ContractApp.methodSend tx raw", rawTx)
            logger.info(`ContractApp.methodSend signedTxHex= ${signedTxHex} txid= ${txid}`)


            if (options.async) {
                this.sendTransaction(signedTxHex)
            } else {
                await this.sendTransaction(signedTxHex)
            }
            
            return {
                rawTx, signedTxHex
            }
        } catch (e) {
            logger.error(e)
        }

    }

    async funcEncode(funcname, args) {
        return await this.contractWrapper.funcEncode(funcname, args)
    }

    async dataSend(data, to, address, options={}) {
        const that = this

        try {
            const start = Date.now()
            logger.info(`ContractApp.dataSend ${data} start=`, start)
            const account = await this.loadAccount(address)
            logger.warn('loadAccount use', Date.now() - start)
            // * step3 nonce
            const nonce = options.nonce ? options.nonce : await this.getNonce(account)
            logger.info("ContractApp.dataSend nonce", nonce)

            const opts = { nonce, gas: 100000 }
            if (options.gasPrice) {
                opts.gasPrice = options.gasPrice
            }
            if (options.gas) {
                opts.gas = options.gas
            }

            const rawTx = {
                to,
                value: options.value ? options.value : '0x00',
                data,
                ...opts,
            }
            const signedTxHex = await account.signTxHex(rawTx)
            logger.debug("ContractApp.dataSend tx raw", rawTx)
            // logger.debug(`ContractApp.dataSend signedTxHex=${signedTxHex}`)

            const txid = keccak256(signedTxHex)
            if (options.async) {
                await this.sendTransactionPromise(signedTxHex)
                return { txid, nonce, rawTx, signedTxHex }
            } else {
                await this.sendTransaction(signedTxHex)
            }

            return {
                txid, nonce, rawTx, signedTxHex
            }
        } catch (e) {
            logger.error(e)
        }

    }
}

class Erc20App extends ContractApp {
    constructor(util, config, tokenSym) {
        super(util, config)

        this.token = this.loadToken(tokenSym)
        this.setContractWrapper(this.token)
    }

    async ethTransfer(from, to, value, options={}) {
        return await super.transfer(from, to, value, options)
    }

    async balanceOf(who) {
        return await this.token.balanceOf(who)
    }

    async transfer(from, to, value, options) {
        await this.methodSend('transfer', [to, value], from, options)
    }

    async approve(_spender, value, options) {
        try {
            await this.methodSend('approve', [_spender, value], from, options)
        } catch (e) {
            logger.error(e)
        }
    }
}

module.exports = { 
    App, 
    Erc20App, 
    ContractApp,
}
