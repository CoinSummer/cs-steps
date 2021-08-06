'use strict'
const BN = require('bignumber.js')
const { toWei, fromWei } = require('web3-utils')

function deploy(eth, ownerAccount, abi, bytecode, arg=[], gasPrice=20000000000) {
    var c = new eth.Contract(abi);
    var deployObj = c.deploy({data: bytecode, arguments: arg})

    var rawTx = {
        from: ownerAccount.addr,
        value: '0',
        data: deployObj.encodeABI()
    }
    // const that = this;
    deployObj.estimateGas().then(gas => {
        rawTx.gas = parseInt(gas * 1.2)
        rawTx.gasPrice = gasPrice
        rawTx.nonce = 35
        const cost = fromWei(BN(gas).times(gasPrice).toString(), "ether")
        console.log(rawTx.from, rawTx.gasPrice, rawTx.gas, 'cost=', cost)

        if (process.env.SUBMIT === 'Y') return ownerAccount.signTxHex(rawTx).then(signedTxHex => {
            return eth.sendSignedTransaction(signedTxHex).on('transactionHash', hash => {
                console.log("合约部署提交成功：", hash)
            })
            .on('receipt', receipt => {
                console.log("合约部署响应：", receipt)
            })
            .on('confirmation', (confirmationNumber, receipt) => { 
                console.log("合约部署事物确认：", confirmationNumber, receipt)
            })
            .on('error', err => {
                console.error("合约部署失败", err)
            }); 
        })
    })
}


module.exports = {
    deploy, 
}