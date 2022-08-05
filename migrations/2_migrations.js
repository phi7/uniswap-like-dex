//requireはimportみたいなものnodejsと同じ
const Dai = artifacts.require("Dai");
const Link = artifacts.require("Link");
const Comp = artifacts.require("Comp");

const Dex = artifacts.require("Dex");

//"ether"と書くことで10**18乗をかけるのとおなじになる
const toWei = (number) => web3.utils.toWei(web3.utils.toBN(number), "ether");

//外部のファイルがこのファイルを読み込む
//deployerはdeployするためのもの．それが引数として入ってくる
module.exports = async function (deployer){
  //コンストラクターの引数を入れる．WEI表記
  //toBNでビッグナンバーを扱える.各トークンのデプロイで毎回，web3.utils.toBNと書くのは良くないのでtoWeiを作った
  //dai
  await deployer.deploy(Dai,"Dai","DAI",toWei(10**10));
  //deployed()でインスタンスが手に入る．直前にデプロイしたコントラクトのインスタンスが手に入る
  const dai = await Dai.deployed();
  //link
  await deployer.deploy(Link,"Chainlink","LINK",toWei(10**6));
  const link = await Link.deployed();
  //comp
  await deployer.deploy(Comp,"Compound","COMP",toWei(10**4));
  const comp = await Comp.deployed();

  //dexをデプロイ
  await deployer.deploy(Dex,[dai.address,link.address,comp.address]);

  //dexにトークンを渡す．
  //インスタンスを定義すればコントラクト内の関数を使えるようになる
  //コントラクトにはコントラクトをデプロイした際にすでにトータルサプライ分が渡っている.
  await dai.transfer(Dex.address, toWei(10**10));
  await link.transfer(link.address, toWei(10**6));
  await comp.transfer(comp.address, toWei(10**4));


}
