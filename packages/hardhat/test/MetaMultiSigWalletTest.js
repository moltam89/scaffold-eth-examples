const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("MetaMultiSigWallet Test", () => {
  let metaMultiSigWallet;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  let provider;

  const CHAIN_ID = 1; // I guess this number doesn't really matter
  let signatureRequired = 1; // Starting with something straithforward

  // Running this before each test
  // Deploys MetaMultiSigWallet and sets up some addresses for easier testing
  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    let metaMultiSigWalletFactory = await ethers.getContractFactory("MetaMultiSigWallet");

    metaMultiSigWallet = await metaMultiSigWalletFactory.deploy(CHAIN_ID, [owner.address], signatureRequired);

    await owner.sendTransaction({
      to: metaMultiSigWallet.address,
      value: ethers.utils.parseEther("1.0")
    });

    provider = owner.provider;
  });

  describe("Deployment", () => {
    it("isOwner should return true for the owner address", async () => {     
      expect(await metaMultiSigWallet.isOwner(owner.address)).to.equal(true);
    });
  });

  describe("Testing MetaMultiSigWallet functionality", () => {
    it("Adding a new signer", async () => {
      let newSigner = addr1.address;

      let nonce = await metaMultiSigWallet.nonce();
      let to = metaMultiSigWallet.address;
      let value = 0;

      let callData = metaMultiSigWallet.interface.encodeFunctionData("addSigner",[newSigner, 1]);
      
      let hash = await metaMultiSigWallet.getTransactionHash(nonce, to, value, callData);

      const signature = await owner.provider.send("personal_sign", [hash, owner.address]);

      // Double checking if owner address is recovered properly, executeTransaction would fail anyways
      expect(await metaMultiSigWallet.recover(hash, signature)).to.equal(owner.address);

      await metaMultiSigWallet.executeTransaction(metaMultiSigWallet.address, value, callData, [signature]);

      expect(await metaMultiSigWallet.isOwner(newSigner)).to.equal(true);
    });

    it("Update Signatures Required to 2 - locking all the funds in the wallet, becasuse there is only 1 signer", async () => {
      let nonce = await metaMultiSigWallet.nonce();
      let to = metaMultiSigWallet.address;
      let value = 0;

      let callData = metaMultiSigWallet.interface.encodeFunctionData("updateSignaturesRequired",[2]);
      
      let hash = await metaMultiSigWallet.getTransactionHash(nonce, to, value, callData);

      const signature = await owner.provider.send("personal_sign", [hash, owner.address]);

      // Double checking if owner address is recovered properly, executeTransaction would fail anyways
      expect(await metaMultiSigWallet.recover(hash, signature)).to.equal(owner.address);

      await metaMultiSigWallet.executeTransaction(metaMultiSigWallet.address, value, callData, [signature]);

      expect(await metaMultiSigWallet.signaturesRequired()).to.equal(2);
    });

    it("Transferring 0.1 eth to addr1", async () => {
      let addr1BeforeBalance = await provider.getBalance(addr1.address);

      let nonce = await metaMultiSigWallet.nonce();
      let to = addr1.address;
      let value = ethers.utils.parseEther("0.1");

      let callData = "0x00"; // This can be anything, we could send a message 
      
      let hash = await metaMultiSigWallet.getTransactionHash(nonce, to, value.toString(), callData);

      const signature = await owner.provider.send("personal_sign", [hash, owner.address]);

      await metaMultiSigWallet.executeTransaction(to, value.toString(), callData, [signature]);

      let addr1Balance = await provider.getBalance(addr1.address);

      expect(addr1Balance).to.equal(addr1BeforeBalance.add(value));
    });
  });
});