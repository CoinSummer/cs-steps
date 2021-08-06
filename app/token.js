'use strict'

const { toWei, fromWei } = require('web3-utils')
const { ContractWrapper } = require('./util')

class TokenERC20 extends ContractWrapper {
    constructor(eth, abi, addr, config={}) {
        super(eth, abi, addr)
    
        this.name = config.name
        
        this.symbol = config.symbol
        this.address = config.address
        this.tags = config.tags || []
        this.decimals = config.decimals || 18
        this.unit = config.unit || 'ether'
    }
    
    totalSupply() {
        return this.contract.methods.totalSupply().call()
    };

    // balanceOf(address who) public view returns (uint256);
    balanceOf(who) {
        return this.contract.methods.balanceOf(who).call()
    }

    toWei(value) {
        return toWei(String(value), this.unit)
    }

    fromWei(value) {
        return fromWei(String(value), this.unit)
    }
}


class StandardToken extends TokenERC20 {
    constructor(eth, abi, addr, config) {
        super(eth, abi, addr, config)
    }

    // function transferFrom(address _from, address _to, uint256 _value) public returns (bool) 
    transferFrom(senderAddr, _from, _to, _value, options) {
        const rawTx = Object.assign({} , {
            from: senderAddr,
            to: this.address,
            value: '0x00',
            data: this.contract.methods.transferFrom(_from, _to, _value).encodeABI()
            // nonce: '0x00',
            // gas: 2000000,
        }, options)
        return rawTx
    }

    // approve(address _spender, uint256 _value) public returns (bool)
    approve(_spender, _value, options) {
        const rawTx = Object.assign({} , {
            to: this.address,
            value: '0x00',
            data: this.contract.methods.approve(_spender, _value).encodeABI()
        }, options)
        return rawTx
    }

    // increaseApproval(address _spender, uint _addedValue) public returns (bool)
    increaseApproval(_spender, _value, options) {
        const rawTx = Object.assign({} , {
            to: this.address,
            value: '0x00',
            data: this.contract.methods.increaseApproval(_spender, _value).encodeABI()
        }, options)
        return rawTx
    }

    // decreaseApproval(address _spender, uint _subtractedValue) public returns (bool)
    decreaseApproval(_spender, _value, options) {
        const rawTx = Object.assign({} , {
            to: this.address,
            value: '0x00',
            data: this.contract.methods.decreaseApproval(_spender, _value).encodeABI()
        }, options)
        return rawTx
    }

    // allowance(address _owner, address _spender) public view returns (uint256) 
    allowance(_owner, _spender) {
        return this.contract.methods.allowance(_owner, _spender).call()
    }
}


module.exports = {
    TokenERC20, 
    StandardToken
}