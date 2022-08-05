//コントラクトのビルドファイル
const Dai = artifacts.require("Dai");
const Link = artifacts.require("Link");
const Comp = artifacts.require("Comp");

//truffleインストールしたときに入っているわけではないのでインストールする
const BN = require("bn.js");
const chai = require("chai");
const { expect } = chai;
//chaiではもともとBNが使えないのでそれが使えるようにする宣言
chai.use(require("chai-bn")(BN));

const truffleAssert = require("truffle-assertions");

const toWei = (number) => web3.utils.toWei(web3.utils.toBN(number), "ether");

//テストの名前をいれる
//どこでaccountsを代入しているいるのだろうか・・・？
contract("ERC20 token test", (accounts) => {
  let dai, link, comp;
  //1とか2だとわかりにくいので名前をつける
  const owner = accounts[0];
  const alice = accounts[1];
  const bob = accounts[2];

  //awaitが必要なものはbeforeの中にかく
  before(async () => {
    dai = await Dai.deployed();
    link = await Link.deployed();
    comp = await Comp.deployed();
  });

  //itの数が多い場合，わけわからなくなるのでdescribeを用いる
  //分類分けして整理できる
  //describeの中にbeforeやafterもかける
  describe("Supply", () => {
    //itの中にテストの名前を書く
    it("Should return token names and symbols correctly", async () => {
      //daiの名前がが”Dai”になることを期待する
      const daiName = await dai.name();
      const linkName = await link.name();
      const compName = await comp.name();
      expect(daiName).to.equal("Dai");
      expect(linkName).to.equal("Chainlink");
      expect(compName).to.equal("Compound");
    });
  });

  //ユーザーの初期残高チェック
  //ownerが全部持っていて，AliceとBobはゼロを期待
  describe("Supply and balance test", () => {
    //トータルサプライがあっているか確認する
    //bignumberを扱うときはto.bignumber.equalがいる
    //.equalの他にも.gtや.gte,.lt,.lteとかある．
    it("Should have correct total supply", async () => {
      const totalSupply = await comp.totalSupply();
      const ten_thousand = web3.utils.toWei(web3.utils.toBN(10 ** 4), "ether");
      expect(totalSupply).to.be.bignumber.equal(ten_thousand);
    });

    it("Should have correct initial balances", async () => {
      const ownerBalance = await comp.balanceOf(owner);
      const aliceBalance = await comp.balanceOf(alice);
      const ten_thousand = web3.utils.toWei(web3.utils.toBN(10 ** 4), "ether");
      const zero = web3.utils.toBN(0);
      //   totalSupply = await comp.totalSupply();
      expect(ownerBalance).to.be.bignumber.equal(ten_thousand);
      //以下でもOK
      //expect(ownerBalance).to.be.bignumber.equal(totalSupply);
      expect(aliceBalance).to.be.bignumber.equal(zero);
    });
  });

  //   //transfer後に残高が更新されるか
  //   describe("Supply and balance test", () => {
  //     //1000ethだったらトランザクションが通って欲しい
  //     it("Should pass when transfer amount <= balance", async () => {
  //         const transferAmount = web3.utils.toBN(1000);
  //         await truffleAssert.passes(comp.transfer(alice,transferAmount))
  //     });

  //     //transfer後の残高
  //     it("Should update balances accordingly", async () => {
  //         const ownerBalance = await comp.balanceOf(owner);
  //         const aliceBalance = await comp.balanceOf(alice);
  //         const totalSupply = await comp.totalSupply();
  //         const thousand = new BN(1000);
  //         expect (ownerBalance).to.be.bignumber.equal(totalSupply.sub(thousand));
  //         expect (aliceBalance).to.be.bignumber.equal(thousand);
  //     });
  //   });
  describe("transfer() test", () => {
    it("Should revert when transfer amount > balance", async () => {
      const ownerBalance = await comp.balanceOf(owner);
      const transferAmount = ownerBalance.add(new BN(1));
      await truffleAssert.reverts(comp.transfer(alice, transferAmount));
    });

    it("Should pass when transfer amount <= balance", async () => {
      const transferAmount = web3.utils.toBN(1000);
      await truffleAssert.passes(comp.transfer(alice, transferAmount));
    });

    it("Should update balances accordingly", async () => {
      const ownerBalance = await comp.balanceOf(owner);
      const aliceBalance = await comp.balanceOf(alice);
      const totalSupply = await comp.totalSupply();
      const thousand = new BN(1000);
      expect(ownerBalance).to.be.bignumber.equal(totalSupply.sub(thousand));
      expect(aliceBalance).to.be.bignumber.equal(thousand);
    });
  });

  //transfer後の残高
  describe("transferFrom() test", () => {
    //最初にaliceからbobに割り当てる量を決定
    before(async () => {
      const approveAmount = web3.utils.toBN(500);
      //{from: alice}なんていう引数の用意のしかたがあるのか？
      await comp.approve(bob, approveAmount, { from: alice });
    });

    //割当を超えて使用しようとしたとき，失敗して欲しい
    it("Should revert when transfer amount > allowance", async () => {
      const tranfferAmount = web3.utils.toBN(501);
      await truffleAssert.reverts(
        //bobがaliceからbobに501を動かそうとする
        comp.transferFrom(alice, bob, tranfferAmount, { from: bob })
      );
    });

    //成功を期待
    it("Should pass when transfer amount <= allowance", async () => {
      //割当量全額 (= 500)
      const transferAmount = await comp.allowance(alice, bob);
      await truffleAssert.passes(
        //bobがaliceからbobに500を動かそうとする
        comp.transferFrom(alice, bob, transferAmount, { from: bob })
      );
    });
  });
});
