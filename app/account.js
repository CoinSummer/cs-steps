'use strict'

const fs = require('fs')
var path = require('path');

class Account {
    constructor(eth, addr) {
        this.eth = eth;
        this.addr = addr;
        this.privateKey = null
        this.ethBalanceWei = 0
        this.nonce = 0
    }
    
    transfer(to, value, options) {
        const rawTx = Object.assign({} , {
            from: this.addr,
            to,
            value,
            // nonce: '0x00',
            gas: 20000000000,
        }, options)
        return rawTx
    }

    setPrivateKey(key) {
        this.privateKey = key
    }

    decryptAccountFile(password, env='prod') {
        const home = path.dirname(__dirname)
        const pkPath = `${home}/keystore/${env}/${this.addr}`;
        // console.log(pkPath, password)
        const that = this;
        return new Promise((resolve, reject) => {
            fs.readFile(pkPath, 'utf8', (err, data) => {
                if (err) reject(err);
                const jsonV3 = JSON.parse(data)
            
                const { privateKey } = that.eth.accounts.decrypt(jsonV3, password)
                this.privateKey = privateKey
                // console.log(privateKey)
                resolve(privateKey)
            })
        })
    
    }

    signTxHex(tx) {
        return this.eth.accounts.signTransaction(tx, this.privateKey).then(data => { 
            return data.rawTransaction
        })
    }

    async sign(data) {
        return await this.eth.accounts.sign(data, this.privateKey);
    }
}


const global_accounts = {}


function getAccountFromCache(addr) {
    if (global_accounts[addr]) {
        return global_accounts[addr]
    }
}

function addAccountToCache(Account) {
    global_accounts[Account.addr] = Account
}

module.exports = { Account, getAccountFromCache, addAccountToCache, global_accounts }