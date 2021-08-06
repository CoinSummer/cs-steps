'use strict'

const UniswapV2PairJson = require('../abis/UniswapV2Pair.json')
const UniswapV2Router02Json = require('../abis/UniswapV2Router02.json')

const { ContractWrapper } = require('./util')

class UniswapV2Router02 extends ContractWrapper {
    constructor(eth, addr, options={}) {
        super(eth, UniswapV2Router02Json.abi, addr, options)
    }

    async getAmountsOut(amountIn, path){
        return this.contract.methods.getAmountsOut(amountIn, path).call()
    }

    async getAmountsIn(amountOut, path){
        return this.contract.methods.getAmountsIn(amountOut, path).call()
    }
   
    // swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)
    /**
     *
     * @param {*} amountIn
     * @param {*} amountOutMin
     * @param {*} path
     * @param {*} to
     * @param {*} deadline
     *  #	Name	      Type	              Data
        0	amountIn	  uint256	          50000000000000000000
        1	amountOutMin  uint256	          768551983692771716
        2	path	      address[]	          b8baa0e4287890a5f79863ab62b7f175cecbd433 c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
        3	to	          address	          9c27d032c173acea36f5cdd9d4b9edd918c468f5
        4	deadline	  uint256	          1599447912
     */
    async swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline, options) {
        return { ...{
            to: this.contract.options.address,
            value: '0x00',
            data: this.contract.methods.swapExactTokensForETH(amountIn, amountOutMin, path,  to, deadline).encodeABI()
        }, ...options }
    }
}

class UniswapV2Pair  extends ContractWrapper {
    constructor(eth, addr, options={}) {
        super(eth, UniswapV2PairJson.abi, addr, options)
    }
}

class Vault extends ContractWrapper {
    constructor(eth, addr, options={}) {
        super(eth, VaultJson.abi, addr, options)
    }

    // function deposit(uint256 amount) external defense 
    async deposit(amount, options) {
        return {
            to: this.contract.options.address,
            value: '0x00',
            data: this.contract.methods.deposit(amount).encodeABI(),
            ...options 
        }
    }
}


module.exports = {
    UniswapV2Router02,
    UniswapV2Pair,
    Vault,
}
