const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];

function Blockchain() //PARENT CONSTRUCTOR
{
    this.chain = [];
    this.pendingTransactions = [];
    this.networkNodes = []; //LIST OF NODES IN THE NETWORK LIST
    this.currentNodeUrl = currentNodeUrl;
    this.createNewBlock('0', 0 , '0'); //call create block function and make genesis
    
}
//CREATES A NEW BLOCK AND ADDS IT TO THE EXISTING BLOCK
Blockchain.prototype.createNewBlock = function(hashOfTheBlock, nonceOfTheBlock,prevBlockHash)
{
    var newBlock = 
    {
        index : this.chain.length+1,
        transactions : this.pendingTransactions,
        timestamp : new Date(),
        hash : hashOfTheBlock, //get from the hash genertaor
        prevBlockHash: prevBlockHash, //previous hash unit
        nonce: nonceOfTheBlock,
    
    };
    this.pendingTransactions = []; //clear out pending transactions
    this.chain.push(newBlock); //add block to chain
    return newBlock;
}
//return me the last blocks's information
Blockchain.prototype.getLastBlock = function()
{
    var lastBlock=this.chain[this.chain.length-1] ;
    return lastBlock;
}
//CREATE A TRANSACTION AND ADD IT INTO THE PENDING TRANSACTION

Blockchain.prototype.createTransaction= function(asset, toDepartment, fromDepartment, quantity)
{
    var newTransaction =
{
    assetId: this.chain.length+1,
    asset: asset,
    toDepartment : toDepartment,
    fromDepartment: fromDepartment,
    quantity: quantity,
};
this.pendingTransactions.push(newTransaction);
return newTransaction;
}
Blockchain.prototype.generateHashOfBlock = function(currentBlockData, nonce, prevBlockHash)
{
    var dataAsString = JSON.stringify(currentBlockData)+ nonce.toString()+ prevBlockHash;
    var hash = sha256(dataAsString);
    return hash;
}
Blockchain.prototype.proofOfWork = function(currentBlockData, prevBlockHash)
{
    let nonce = 0;
    var hash = this.generateHashOfBlock(currentBlockData,nonce, prevBlockHash);
    while(hash.substring(0,2)!=='00')
    {
        nonce++;
        hash = this.generateHashOfBlock(currentBlockData,nonce, prevBlockHash);
    }
    return nonce;
}
//validating the longest chain
Blockchain.prototype.chainIsvalid = function(longestChain)
{
    let validChain = true;
    for(var i=1; i<longestChain.length; i++)
    {
        const currentBlock = longestChain[i];
        const prevBlock = longestChain[i-1];
        const blockHash = this.generateHashOfBlock(currentBlock['transactions'], prevBlock['hash'], currentBlock['nonce']);
        if(blockHash.substring(0,2)!=="00")
        {
            validChain = false;
        }
        if(currentBlock['prevBlockHash']!== prevBlock['hash'])
        {
            validChain = false;
        }
    }
    const genesisBlock = longestChain[0];
    const correctNonce = genesisBlock['nonce']==0;
    const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === '0';
    const correctHash = genesisBlock['hash']==='0';
    const correctTransactions = genesisBlock['transactions'].length=== 0;
    if(!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions) validChain = false;
    return validChain;
}
//give back the block info based on the hash to network application
Blockchain.prototype.getBlock1= function()
{
    let correctBlock = null;
    this.chain.forEach(block=>
        {
            if(block.index==1)
            correctBlock=block;
        });
    
    return correctBlock;
};
Blockchain.prototype.getBlock2= function()
{
    let correctBlock = null;
    this.chain.forEach(block=>
        {
            if(block.index==2)
            correctBlock=block;
        });
    
    return correctBlock;
};
Blockchain.prototype.getBlock3= function()
{
    let correctBlock = null;
    this.chain.forEach(block=>
        {
            if(block.index==3)
            correctBlock=block;
        });
    return correctBlock;
};
Blockchain.prototype.getBlock4= function()
{
    let correctBlock = null;
    this.chain.forEach(block=>
        {
            if(block.index==4)
            correctBlock=block;
        });
    
    return correctBlock;
};
Blockchain.prototype.getChain= function()
{
    let correctBlock = [];
    var len = this.chain.length;
    for(var i =1; i<=len; i++)
    {
        this.chain.forEach(block=>
            {
                if(block.index===i)
                correctBlock[i-1]=block;
            });
       
    }
    return correctBlock;
};
Blockchain.prototype.getBlock= function(searchValue)
{
    let correctBlock = null;
    this.chain.forEach(block=>
        {
            if(block.hash===searchValue)
            correctBlock=block;
        });
    return correctBlock;
};
Blockchain.prototype.getIndex= function(searchValue)
{
    let correctBlock = null;
    this.chain.forEach(block=>
        {
            if(block.index===searchValue)
            correctBlock=block;
        });
    return correctBlock;
};
Blockchain.prototype.getCount= function()
{
    let correctCount = null;
    this.chain.forEach(block=>
        {
           correctCount++;
        });
    return correctCount;
};
Blockchain.prototype.getTransactio = function(transactionId) {
	let correctTransaction = null;
	let correctBlock = null;

	this.chain.forEach(block => {
		block.transactions.forEach(transaction => {
            if (transaction.transactionId === transactionId) 
            {
				correctTransaction = transaction;
				correctBlock = block;
			};
		});
	});

	return {
		transaction: correctTransaction,
		block: correctBlock
    };
}
Blockchain.prototype.getTransaction = function() {
	/*var lastBlock=this.chain[this.chain.length-1] ;
    console.log(lastBlock.transaction);*/
    let lastBlock = null;
    this.chain.forEach(block=>
        {
            if(block.index===1)
            lastBlock=block;
        });
  
	return lastBlock;
}
Blockchain.prototype.getAssetTransfer=function()
{
    var correctAsset= null;
    var lastBlock = this.chain[this.chain.length-1] ;
    var lastAsset = lastBlock.transactions;
    var len = lastAsset.length;
    correctAsset = lastAsset[len-1];
        console.log(correctAsset);
        return correctAsset;
}

module.exports = Blockchain; //permission to import on another js file