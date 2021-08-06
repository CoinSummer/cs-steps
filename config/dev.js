'use strict'

module.exports = (app) => {
    return {
        homeDir: app.homeDir,
        url: 'http://127.0.0.1:7545',
        accounts: [
            {
                address: "0x0860123e5bc9bc6f40789e6f2929f7fdf35643ff",
                name: 'ganache',
                password: "!QAZxsw2",
                enabled: true,
                default: true,
            },
            {
                address: "0x0b52d613e73256f42c6100e214778a4122414617",
                name: 'ganche',
                password: "asdewq",
                enabled: true,
            }, 
        ],
        tokens: {
            "VAN": {
                symbol: "VAN",
                tags: ['mintable', 'burnable'],
                jsonPath: `${app.homeDir}/projects/ERC20/VAN/build/contracts/VanToken.json`,
                args: [],
                address: "0x1dbA7997693EEfDf77012b7966100BD3F730548F",
                creator: "0x0B52D613E73256F42C6100e214778A4122414617"
            },
            "ASIA": {
                symbol: "ASIA",
                tags: ['mintable', 'burnable'],
                jsonPath: `${app.homeDir}/projects/ERC20/ASIA/build/contracts/AsiaToken.json`,
                args: [],
                address: "0xD1D8A0772a5B2Cf583f76a91Ba63e1bE80c7020E",
                creator: "0x0B52D613E73256F42C6100e214778A4122414617"
            },
            "MAX": {
                symbol: "MAX",
                tags: ['mintable', 'burnable'],
                jsonPath: `${app.homeDir}/projects/ERC20/ASIA/build/contracts/AsiaToken.json`,
                args: [],
                address: "0x37ea6f8Dd77B13fdee7b10Cb61d069402249A75b",
                creator: "0x0B52D613E73256F42C6100e214778A4122414617"
            },
            "WETH": {
                symbol: "WETH",
                tags: ['mintable', 'burnable'],
                jsonPath: `${app.homeDir}/projects/ERC20/WETH/build/contracts/WETH9.json`,
                args: [],
                address: "0x4A0F377A7cD04b3396f8f189da7Ac8Cf400e44EF",
                creator: "0x0B52D613E73256F42C6100e214778A4122414617"
            },
        },
        contracts: {
            "UniswapV2Factory": {
                name: "UniswapV2Factory",
                jsonPath: `${app.homeDir}/projects/UniswapV2Factory/build/contracts/UniswapV2Factory.json`,
                args: [],
                address: "0x1a8038Ac3b3FF03f6Dc9F30b395b42C3C49039f9",
                txHash: "0x672e2d3c0c75f8a607fe659804ad7ccbaaa30c6eddad0cf0a487af1ca5d0cd31",
                creator: "0x0B52D613E73256F42C6100e214778A4122414617"
            },
            "UniswapV2Router02": {
                name: "UniswapV2Router02",
                jsonPath: `${app.homeDir}/projects/UniswapV2Router/build/contracts/UniswapV2Router02.json`,
                args: ['0x1a8038Ac3b3FF03f6Dc9F30b395b42C3C49039f9', "0x4A0F377A7cD04b3396f8f189da7Ac8Cf400e44EF"],
                address: "0x17bbfE799FDD4110763AAC5a4a59E6c70713B4F7",
                txHash: "0x14d38e5cdc59df6bf563392c20761b3d75b6244eccd907c30b08a42beac3a83d",
                creator: "0x0B52D613E73256F42C6100e214778A4122414617"
            },
        
        }
    } 
}