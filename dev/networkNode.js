const { prototype, captureRejectionSymbol } = require('events');
var express = require('express'); //IMPORTED THE EXPRESS JS
var cryptoNetworkApp = express(); //EXTENDING THE FUNCTIONALITY OF EXPRESS TO CRYPTO
//IMPORTED THE BASIC BLOCKCHAIN STRUCTURE IN TO THE SERVER NETWORK
var Blockchain = require('./blockchain');
var cryptoChain = new Blockchain();
var port = process.argv[2]; //MADE THE PORT DYNAMIC
//IMPORT BODY PARSER
const bodyParser = require('body-parser');
cryptoNetworkApp.use(bodyParser.json());
cryptoNetworkApp.use(bodyParser.urlencoded({extended: false}));

//IMPORT REQUEST PROMISES
const rp = require('request-promise');

//END POINT FOR RETRIEVING THE BLOCKCHIAN
cryptoNetworkApp.get('/blockchain', function(req,res)
{
    res.send(cryptoChain);
    console.log(cryptoChain.chain);
});
//CREATED THE HOMEPAGE
cryptoNetworkApp.get('/', function(req,res)
{
    res.send('This node belongs to miner');
});
cryptoNetworkApp.post('/register-node', function(req,res)
{
    var newNodeUrlToRegister= req.body.newNodeUrl;
    var nodeNotAlreadyPresentInList = cryptoChain.networkNodes.indexOf(newNodeUrlToRegister)==-1;
    var notCurrentNode = cryptoChain.currentNodeUrl !== newNodeUrlToRegister;
    if(nodeNotAlreadyPresentInList && notCurrentNode)
    {
        const newLocal = cryptoChain.networkNodes.push(newNodeUrlToRegister);
        res.json({note:'new node registered successfull'});
    }
});
//THIS API RECEIVES A TRANSACTIONS AND ADDS IT TO THE PENDING TRANSACTIONS
cryptoNetworkApp.post('/transaction', function(req,res)
{
    var newTransaction = req.body;
    //add these transactions to pending tansaction array
    cryptoChain.pendingTransactions.push(newTransaction);
});
//API TO BROADCAST ALL TRANSACTIONS
cryptoNetworkApp.post('/transaction-broadcast', function(req,res)
{
    //update at the primary node
    var newTransaction = req.body;
    //add these transactions to pending transactions array
    cryptoChain.pendingTransactions.push(newTransaction);
    //broadcast the transaction information to all the other nodes
    const requestPromises =[];
    cryptoChain.networkNodes.forEach(networkNodeUrl =>{
        const requestOptions =
        {
            uri: networkNodeUrl + '/transaction',
            method : 'POST',
            body: newTransaction,
            json: true
        };
        requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises)
    .then(data=>{
        res.json({note: 'Transaction created and broadcast successfully.'});
    });
});
//BULK NODE REGISTRY
cryptoNetworkApp.post('/register-nodes-bulk', function(req,res)
{
    var bulkNetworkNodes = req.body.listOfNodes;
    bulkNetworkNodes.forEach(networkNodeurl =>{
    var nodeNotAlreadyPresentInList = cryptoChain.networkNodes.indexOf(networkNodeurl)==-1;
    var notCurrentNode = cryptoChain.currentNodeUrl !== networkNodeurl;
    if(nodeNotAlreadyPresentInList&& notCurrentNode)
    {
        const newLocal = cryptoChain.networkNodes.push(networkNodeurl);
    }
    })
});
cryptoNetworkApp.post('/register-and-broadcast-node',function(req,res)
{
//register the node
const newNodeUrl = req.body.newNodeUrl; //incoming address of the node that wants to register
//update contact list of the recipient node
if(cryptoChain.networkNodes.indexOf(newNodeUrl)==-1)
{
    cryptoChain.networkNodes.push(newNodeUrl);
}

//broadcast node address functionality
const regNodesPromises = [];
cryptoChain.networkNodes.forEach(networkNodeurl=>
    {
        const requestOptions=
        {
            uri: networkNodeurl+ '/register-node',
            method: 'POST',
            body: {newNodeUrl:newNodeUrl},
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });

//bulk register all the node in network
Promise.all(regNodesPromises)
.then(data=>{
    const bulkRegisterOptions = {
        uri:newNodeUrl + '/register-node-bulk',
        method:'POST',
        body: {bulkNetworkNodes: [...cryptoChain.networkNodes, cryptoChain.currentNodeUrl]},
        json : true
    };
    return rp(bulkRegisterOptions)
})
.then(data=>{
    res.json({note: 'new node registered with the network successfully'});
});

//broadcast the node
} )


//MINING PROCESS OVER THE NETWROK
cryptoNetworkApp.get('/mine', function(req,res)
{
    //tast-1 is to create a new block 

    var lastBlockInfo = cryptoChain.getLastBlock();
    var prevBlockHash = lastBlockInfo['hash'];
    var currentBlockData = JSON.stringify(cryptoChain.pendingTransactions);
    var nonceOfTheBlock = cryptoChain.proofOfWork(currentBlockData, prevBlockHash);
    var hashOfTheBlock = cryptoChain.generateHashOfBlock(currentBlockData, nonceOfTheBlock, prevBlockHash);
    var newBlock = cryptoChain.createNewBlock(hashOfTheBlock, nonceOfTheBlock, prevBlockHash);
    res.send(newBlock);


    //task-2
    //broadcast the newly created block info to all the other nodes
    const requestPromises = [];
    cryptoChain.networkNodes.forEach(networkNodeUrl=>{
        const requestOptions = {
            uri: networkNodeUrl+'/receive-new-block',
            method: 'POST',
            body: {newBlock: newBlock},
            json: true

        };
        requestPromises.push(rp(requestOptions))
    })


    //task3
    // reward the node which created and broadcasted the block
    Promise.all(requestPromises)
    .then(data =>{
        const requestOptions= {
            uri : cryptoChain.currentNodeUrl+'/transaction-broadcast',
            method: 'POST',
            body: {
                amount: 6,
                sender:"00",
                recipient: cryptoChain.currentNodeUrl
            },
            json:true
        };
        return rp(requestOptions);
    })
    .then(data => {
        res.json({
            note: "New block mined & broadcast successfully",
            block: newBlock
        });
    });
});

//RECEIVE NEW BLOCK - DO VALIDATION TO CHECK WHETHER THE BLOCK IS LEGIT OR NOT
cryptoNetworkApp.post('/receive-new-block', function(req,res)
{
    const newBlock= req.body.newBlock;
    var lastBlockInfo = cryptoChain.getLastBlock();
    const correctHash = lastBlockInfo['hash']=== newBlock.prevBlockHash;
    const correctIndex = lastBlockInfo['index']+1=== newBlock['index'];
    if(correctHash&&correctIndex)
    {
        cryptoChain.chain.push(newBlock);
        cryptoChain.pendingTransactions=[];
    res.json({
        note: 'new Block is received'
    });
    }
    else
    {
        res.json({note: 'new block is rejeceted'});
    }
});

//consensus
cryptoNetworkApp.get('/consensus', function(req,res)
{
    //tast1 is to identitfy the longest chain
    const requestPromises=[];
    cryptoChain.networkNodes.forEach(networkNodeUrl=>{
        const requestOptions={
            uri: networkNodeUrl+'/blockchain',
            method: 'GET',
            json: true
        };
        requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises)
    .then(blockchains=>{
        const currentChainLength = cryptoChain.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;
        blockchains.forEach(blockchain=>
            {
                //check if 3007's length is greater than 3001's length
                if(blockchain.chain.length>maxChainLength)
                {
                    maxChainLength = blockchain.chain.length;
                    newLongestChain=blockchain.chain;
                    newPendingTransactions = blockchain.pendingTransactions;
                };
            });
        
    });
    //solving trust issues
    //validating the longest chain which was found
    if(!newLongestChain || (newLongestChain && !chainIsvalid(newLongestChain)))
    {
        //i wont replace the chain - longest chain is invalid is corrupted
        res.send('chain is not replaced as the longest chian is not availbale or the longest chain is corrupted');


    }
    else{
        //i will replace the chain - when the longest chain is valid
        cryptoChain.chain = newLongestChain;
        cryptoChain.pendingTransactions = newPendingTransactions;
        res.json({
            note: 'This chain has been replaced'
        });

    }
});
cryptoNetworkApp.get('/block1', function(req,res)
{
    const correctBlock = cryptoChain.getBlock1(); //call the getblock func in blockchain.js
    res.json({
        block: correctBlock
    });
});
cryptoNetworkApp.get('/block2', function(req,res)
{
    const correctBlock = cryptoChain.getBlock2(); //call the getblock func in blockchain.js
    res.json({
        block: correctBlock
    });
});
cryptoNetworkApp.get('/block3', function(req,res)
{
    const correctBlock = cryptoChain.getBlock3(); //call the getblock func in blockchain.js
    res.json({
        block: correctBlock
    });
});
cryptoNetworkApp.get('/block4', function(req,res)
{
    const correctBlock = cryptoChain.getBlock4(); //call the getblock func in blockchain.js
    res.json({
        block: correctBlock
    });
});
cryptoNetworkApp.get('/chain', function(req,res)
{
    const correctBlock = cryptoChain.getChain(); //call the getblock func in blockchain.js
    res.json({
        block: correctBlock
    });
});
cryptoNetworkApp.get('/blockCount', function(req,res)
{
    const blockCount = cryptoChain.getCount(); //call the getblock func in blockchain.js
    res.json({
        count: blockCount
    });
});
cryptoNetworkApp.get('/last', function(req,res)
{
    const lastBlock= cryptoChain.getLastBlock(); //call the getblock func in blockchain.js
    res.json({
        last: lastBlock
    });
});
cryptoNetworkApp.get('/asset', function(req,res)
{
    const correctAsset= cryptoChain.getAssetTransfer(); //call the getblock func in blockchain.js
    res.json({
        asset: correctAsset
       
    });
});
// get transaction by transactionId
/*cryptoNetworkApp.get('/transaction/:transactionId', function(req, res) {
	const transactionId = req.params.transactionId;
	const trasactionData = cryptoChain.getTransaction(transactionId);
	res.json({
		transaction: trasactionData.transaction,
		block: trasactionData.block
	});
}); */
cryptoNetworkApp.get('/getSubBlockByDate/:date', function(req,res)
{
    const date=req.params.date;
    const info = cryptoChain.getAssetBlock(date);
    res.json({
        byDate:info
    })
})
cryptoNetworkApp.get('/transaction', function(req, res) {
	const trasactionData = cryptoChain.getTransaction();
	res.json({
		transaction: trasactionData
	});
});
//connecting/hosting the index.html
cryptoNetworkApp.get('/Block_explorer', function (req,res)
{
    res.sendFile('./Block_explorer/index.html', {root: __dirname});
});
cryptoNetworkApp.get('/about', function (req,res)
{
    res.sendFile('./Block_explorer/about.html', {root: __dirname});
});
cryptoNetworkApp.get('/home', function (req,res)
{
    res.sendFile('./Block_explorer/home.html', {root: __dirname});
});
cryptoNetworkApp.get('/bg', function (req,res)
{
    res.sendFile('./Block_explorer/img/bg.svg', {root: __dirname});
});
cryptoNetworkApp.get('/nmam', function (req,res)
{
    res.sendFile('./Block_explorer/img/nmam.png', {root: __dirname});
});
cryptoNetworkApp.get('/manage', function (req,res)
{
    res.sendFile('./Block_explorer/img/manage.svg', {root: __dirname});
});
cryptoNetworkApp.get('/block', function (req,res)
{
    res.sendFile('./Block_explorer/img/block.svg', {root: __dirname});
});

cryptoNetworkApp.get('/block/:blockHash', function(req,res)
{
    const blockHash = req.params.blockHash;
    const correctBlock = cryptoChain.getBlock(blockHash); //call the getblock func in blockchain.js
    res.json({
        block: correctBlock
    });
});
cryptoNetworkApp.get('/index/:blockIndex', function(req,res)
{
    const blockIndex = req.params.blockIndex;
    const correctBlock = cryptoChain.getIndex(blockIndex); //call the getblock func in blockchain.js
    res.json({
        index: correctBlock
    });
});
cryptoNetworkApp.post('/transfer/:assetName/:toDepartment/:fromDepartment/:quantity', function(req,res)
{
    const assetName = req.params.assetName;
    const toDepartment = req.params.toDepartment;
    const fromDepartment = req.params.fromDepartment;
    const quantity = req.params.quantity;
    cryptoChain.createTransaction(assetName, toDepartment, fromDepartment, quantity); //call the getblock func in blockchain.js
});
//MAKING THE PORT LISTEN AT MULTIPLE PORTS
cryptoNetworkApp.listen(port, function()
{
    console.log('in port'+port);
});
