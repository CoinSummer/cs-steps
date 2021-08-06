'use strict'

const BN = require('bignumber.js')
const { getAccountFromCache, addAccountToCache, Account } = require('./account.js')
const { TokenERC20, StandardToken } = require('./token.js')

const log4js = require('log4js');
const logger = log4js.getLogger();


const GWEI = '1000000000'  // eslint-disable-line


class Event {
    constructor(eventPlugins) {
        this.eventPlugins = eventPlugins
    }

    createEventId() {
        const rand = parseInt(Math.random() * 1000)
        const now = Date.now()
        return `${now}${rand}`
    }

    event(action, state, ts, mid, data) {
        logger.info(action, state, ts, mid, data)
        Object.values(this.eventPlugins).forEach(item => {
            item.event(action, state, ts, mid, data)
        })
    }

    addEventPlugin(_plugin, _type) {
        if (!_plugin.name) {
            throw new Error('name of plugin undefined')
        }
        logger.info(`add ${_type} plugin ${_plugin.name}`)
        if (_type === 'event') {
            // 初始化
            this.eventPlugins[_plugin.name] = _plugin
        } else {
            throw new Error(`plugin type ${_type} not allowed!`)
        }
    }
}

class App extends Event {
    constructor(util, config) {
        super({})
        this.util = util
        this.eth = util.getEth();
        this.web3 = util.getWeb3();
        this.config = config


        this.tokens = {}
    }

    async getNonce(account) {
        logger.debug(account.addr)
        const n = await this.eth.getTransactionCount(account.addr)
        const nouce =  account.nonce > n ? account.nonce : n
        account.nonce = nouce + 1
        return nouce
    }

    async accounts(balance=false) {
        const accounts = this.config.accounts.map((item) => {
            return {
                id: item.address,
                address: item.address, 
                name: item.name, 
                enable: item.enable
            }
        })
        if (!balance) { return accounts }
        // const contract = this.util.getTokenContractBySym("UND")
        // const token  = new TokenERC20(contract, this.eth)
        const items = []
        for (const item of accounts){
            const ethAmountWei = await this.eth.getBalance(item.address)
            const ethAmount = this.web3.utils.fromWei(ethAmountWei)

            const n = Object.assign({}, item, { ethAmountWei, ethAmount }) 
            items.push(n)
        }
        return items
    }
    
    async getAccount(addr) {
        let account = getAccountFromCache(addr)
        if (!account) {
            
            const accountConfig = this.config.accounts.find(ac => { return ac.address === addr })
    
            if (accountConfig && accountConfig.password) {
                account = new Account(this.eth, addr)
                await account.decryptAccountFile(accountConfig.password)
            } else {
                throw new Error(`from Account ${addr} not set in config `)
            }
            addAccountToCache(account)
        }
        return account
    }

    // 加载所有已经配置的token
    loadToken(tokenSym) {
        // const tokenOpts = this.config.tokens
        const contract = this.util.getTokenContractBySym(tokenSym)
        const token  = new TokenERC20(contract, this.eth)
        this.tokens[tokenSym] = token
    }

    loadAllTokens() {
        // const tokenOpts = this.config.tokens
        for(const tokenConf of this.config.tokens) {
            const contract = this.util.getTokenContractBySym(tokenConf.symbol)
            const token  = new TokenERC20(contract, this.eth)
            this.tokens[tokenSym] = token
        }
    }

    async sendTransaction(signedTxHex, mid, action, data) {
        const that = this
        this.eth.sendSignedTransaction(signedTxHex)
        .on('transactionHash', hash => {
            data = Object.assign({}, data, { code: 1, tx: signedTxHex, result: { hash } })
            that.event(action, 'HASH', Date.now(), mid, data)
            
            logger.info(`${action} ${mid} 事务提交：`, hash)
        })
        .on('receipt', receipt => {
            data = Object.assign({}, data, { code: 2, tx: signedTxHex, result: { receipt } })
            that.event(action, 'RECEIPT', Date.now(), mid, data)
            
            logger.info(`${action} ${mid} 事务响应：`)
        })
        .on('confirmation', (confirmationNumber, receipt) => { 
            data = Object.assign({}, data, {code: 4, tx: signedTxHex, result: { confirmationNumber, receipt } })
            that.event(action, 'CONFIRMATION', Date.now(), mid, data)
            
            logger.info(`${action} ${mid} 事务确认：`, confirmationNumber)
        })
        .on('error', err => {
            data = Object.assign({}, data, {code: 8, tx: signedTxHex, error: err.message})
            that.event(action, 'ERROR', Date.now(), mid, data)
            
            logger.error(`${action} ${mid} 事务失败：`, err)
        });
    }

    async ethTransfer(from, to, value, options={}) {
        let gasPrice = new BN(this.config.gasPrice * GWEI)
        let { eventId } = options

        const mid = eventId || this.createEventId()
        const action = 'TOKEN_TRANSFER'
        let data = Object.assign({code: 0, createTime: mid}, options)
        this.event(action, 'CREATE', Date.now(), mid, data)

        try {
            const AccountFrom = await this.getAccount(from)

            // * step1 获取当前账户余额
            const ethBalanceWei = await this.eth.getBalance(from)
            const ethBalance = this.web3.utils.fromWei(ethBalanceWei)
            AccountFrom.ethBalanceWei = ethBalanceWei
            logger.info(`当前账户${from} ETH余额 eth: ${ethBalance}  wei: ${AccountFrom.ethBalanceWei}`)

            if (BN(ethBalanceWei).comparedTo(BN(value)) < 1) {
                const errMsg = `ETH 当前账户${from} 余额不足：eth: ${ethBalance} wei: ${ethBalanceWei} < ${value}`
                throw new Error(errMsg)
            }

            // * step2
            const nonce = await this.getNonce(AccountFrom)
            logger.info("nonce", nonce)
            this.event(action, 'NONCE', Date.now(), mid, data)

            let price = await this.eth.getGasPrice();
            logger.info(`系统燃气标准: ${price} ${gasPrice}`)
            price = price > gasPrice ? price : gasPrice 
            const gasNeed = BN(price * 5000)
            logger.info(gasNeed, value )

            if (BN(ethBalanceWei).comparedTo(BN(value).add(BN(gasNeed))) < 1) {
                const errMsg = `ETH 当前账户${from} 余额不足：eth: ${ethBalance} wei: ${ethBalanceWei} < ${value + gasNeed}`
                throw new Error(errMsg)
            }

            const rawTx = AccountFrom.transfer(to, value, { gasPrice: price, nonce })
            // const gas = await this.eth.estimateGas(rawTx)
            rawTx.gas = 21000 * 2

            const signedTxHex = await AccountFrom.signTxHex(rawTx)
            await this.sendTransaction(signedTxHex, mid, action, data) 
        } catch (e) {
            logger.error(e)
            this.event(action, 'ERROR', Date.now(), mid, Object.assign({ data }, { error: e.message }))
        }
        
    }
}

class SwapApp extends Erc20App {
    constructor(util, config) {
        super(util, config)
    }

    // function addLiquidity(
    //     address tokenA,
    //     address tokenB,
    //     uint amountADesired,
    //     uint amountBDesired,
    //     uint amountAMin,
    //     uint amountBMin,
    //     address to,
    //     uint deadline
    async addLiquidity(address, tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline) {
        const that = this
        let gasPrice = new BN(this.config.gasPrice * GWEI)

    
        const action = 'TOKEN_MINT'
        let data = { }
        try {
            // const creator = this.config.tokens[tokenA].creator
            const ownerAccount = await this.getAccount(address)

            const contractA = this.util.getErc20BySym(tokenA)
            const tokena  = new StandardToken(contractA, this.eth)
    
            const totalSupplyA = await tokena.totalSupply()
            logger.info(`当前${tokenA} 总量：${totalSupplyA}`)
            
            const tokenaBalanceWei = await tokena.balanceOf(address)
            const tokenaBalance = this.web3.utils.fromWei(tokenaBalanceWei)
            logger.info(`账户${address} ${tokenA} 余额 eth：${tokenaBalance} wei: ${tokenaBalanceWei}`)

            const contractB = this.util.getErc20BySym(tokenB)
            const tokenb  = new StandardToken(contractB, this.eth)
    
            const totalSupplyB = await tokenb.totalSupply()
            logger.info(`当前${tokenB} 总量：${totalSupplyB}`)
            
            const tokenbBalanceWei = await tokenb.balanceOf(address)
            const tokenbBalance = this.web3.utils.fromWei(tokenaBalanceWei)
            logger.info(`账户${address} ${tokenB} 余额 eth：${tokenbBalance} wei: ${tokenbBalanceWei}`)

    
            // * step3 nonce
            const nonce = await this.getNonce(ownerAccount)
            logger.info("nonce", nonce)
            data = { ...data, nonce }
    
            let price = await this.eth.getGasPrice(); 
            logger.info(`系统燃气标准: ${price} ${gasPrice}`)
            price = price > gasPrice ? price : gasPrice
            logger.info(`燃气价: ${price}`)
            // const rawTx = token.mint(to, BN(value), {price, nonce})
            // const gas = await this.eth.estimateGas(rawTx)
            // rawTx.gas = 79298 // 10000 // gas * 2
           
            // logger.info(rawTx)
            // const signedTxHex = await ownerAccount.signTxHex(rawTx)
            // await this.sendTransaction(signedTxHex, mid, action, data) 
        } catch (e) {
            logger.error(e)
        }
        
    }
}

module.exports = { App, Erc20App, SwapApp }