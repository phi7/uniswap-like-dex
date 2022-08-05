let buyMode = true;
//userが選んでいるトークン
let token = undefined;
//web3とuserとpriceDataはいろんなところで使うのでグローバル変数として定義する
let web3, user, dexInst, tokenInst;
let priceData;
let finalInput, finalOutput;
//abi.jsはグローバルに使えるのでわざわざimportする必要はない

const linkAddr = "0x739efEE7dcD7B88cBd3056A216D02Bb0cb753B10";
const daiAddr = "0xfc981DbF7E71d7b601a720b6bBE0C0ee580E5ad8";
const compAddr = "0x218fec388113783d3F8aFb91799e02814412a5A6";
const dexAddr = "0x76F005C40784a900EcA197f16BEb7f87Ea3C7351";

$(document).on("click", ".dropdown-menu li a", function () {
  let element = $(this);
  let img = element[0].firstElementChild.outerHTML;
  let text = $(this).text();
  //スペースを抜く
  token = text.replace(/\s/g, "");
  //userがログインしていないと{from : user}がとれないのでif文をつける
  if (user) {
    switch (token) {
      case "DAI":
        tokenInst = new web3.eth.Contract(abi.token, daiAddr, { from: user });
        break;
      case "LINK":
        tokenInst = new web3.eth.Contract(abi.token, linkAddr, { from: user });
        break;
      case "COMP":
        tokenInst = new web3.eth.Contract(abi.token, compAddr, { from: user });
        break;
    }
  }
  $(".input-group .btn").html(img + text);
  $(".input-group .btn").css("color", "#fff");
  $(".input-group .btn").css("font-size", "large");
});

//ページが読み込まれたときにwebのインスタンスが読み込まれるようにする
$(document).ready(async () => {
  //メタマスクがあるかチェック
  if (window.ethereum) {
    //Web3.givenProviderはメタマスクが接続しているノードのアドレス
    web3 = new Web3(Web3.givenProvider);
  }
  //毎回値段を読み込むのは大変なのでページを読み込んだときだけ値段を取得するようにする
  priceData = await getPrice();
  console.dir(priceData);
});

//リスナーをつくる
//connect walletが押されたときに反応する
$(".btn.login").click(async () => {
  try {
    //アカウントをリクエスト
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    user = accounts[0];
    dexInst = new web3.eth.Contract(abi.dex, dexAddr, { from: user });
    // ここまでくれば接続されているので表示を切り替える
    $(".btn.login").html("Connexted");
    $(".btn.swap").html("Enter an account");
    $("#username").html(user);
  } catch (error) {
    alert(error.message);
  }
});

//swapボタンが押されたとき
$("#swap-box").submit(async (e) => {
  e.preventDefault();
  try {
    buyMode ? await buyToken() : await sellToken();
  } catch (error) {}
});

$("#arrow-box h2").click(() => {
  if (buyMode) {
    buyMode = false;
    sellTokenDisplay();
  } else {
    buyMode = true;
    buyTokenDisplay();
  }
});

//リアルタイムで入力値から値段を計算
$("#input").on("input", async function () {
  //なにも選択されていない場合はただreturn
  if (token === undefined) {
    return;
  }
  //入力値を計算
  const input = parseFloat($(this).val());
  await updateOutput(input);
});

async function getPrice() {
  //fetchでapiにアクセスできるようになる．
  //jsonはそのままjsで扱えないので.jsonをつける
  const daiData = await (
    await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=dai&vs_currencies=eth"
    )
  ).json();
  const compData = await (
    await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=compound-governance-token&vs_currencies=eth"
    )
  ).json();

  const linkData = await (
    await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=chainlink&vs_currencies=eth"
    )
  ).json();

  return {
    daiEth: daiData.dai.eth,
    linkEth: linkData.chainlink.eth,
    //jsだとハイフンが使えないので辞書のように指定してえる
    compEth: compData["compound-governance-token"].eth,
  };
}

async function updateOutput(input) {
  let output;
  //switchはif文の内容がきまっているとき便利
  switch (token) {
    case "COMP":
      //compを買うときはethがinput．compEthは1コンプあたりのethなので割り算．売るときは掛け算になる
      output = buyMode ? input / priceData.compEth : input * priceData.compEth;
      break;
    case "LINK":
      output = buyMode ? input / priceData.linkEth : input * priceData.linkEth;
      break;
    case "DAI":
      output = buyMode ? input / priceData.daiEth : input * priceData.daiEth;
      break;
  }
  console.log(output);

  //exchangeレートを計算
  const exchangeRate = output / input;
  //0.1を打とうとすると，0を入力したときと.を入力したときに両方ゼロとして反応してしまう．それを弾きたい．
  if (output === 0 || isNaN(output)) {
    $("#output").val("");
    $(".rate.value").css("display", "none");
    $(".btn.swap").html("Enter an amount");
    $(".btn.swap").addClass("disabled");
  } else {
    //表示する桁数を制限
    $("#output").val(output.toFixed(7));
    $(".rate.value").css("display", "block");
    if (buyMode) {
      $("#top-text").html("ETH");
      $("#bottom-text").html(" " + token);
      $("#rate-value").html(exchangeRate.toFixed(5));
    } else {
      $("#top-text").html(token);
      $("#bottom-text").html(" ETH");
      $("#rate-value").html(exchangeRate.toFixed(5));
    }
    await checkBalance(input);
    // weiになおす
    finalInput = web3.utils.toWei(input.toString(), "ether");
    finalOutput = web3.utils.toWei(output.toString(), "ether");
  }
}

async function checkBalance(input) {
  const balanceRaw = buyMode
    ? await web3.eth.getBalance(user)
    : await tokenInst.methods.balanceOf(user).call();
  //wei表記からethになおす
  const balance = parseFloat(web3.utils.fromWei(balanceRaw, "ether"));

  if (balance >= input) {
    $(".btn.swap").removeClass("disabled");
    $(".btn.swap").html("Swap");
  } else {
    $(".btn.swap").addClass("disabled");
    $(".btn.swap").html(`Insufficient ${buyMode ? "ETH" : token} balance`);
  }
}

function buyToken() {
  const tokenAddr = tokenInst._address;
  return new Promise((resolve, reject) => {
    //関数を呼ぶときはmethodsをつける
    dexInst.methods
      .buyToken(tokenAddr, finalInput, finalOutput)
      //callは状態を読むだけ．sendは状態を変えるとき
      .send({ value: finalInput })
      .then((receipt) => {
        // console.log(receipt);
        const eventData = receipt.events.returnValues;
        const amountDisplay = parseFloat(
          web3.utils.fromWei(eventData._amount, "ether")
        );
        const costDisplay = parseFloat(
          web3.utils.fromWei(eventData.cost, "ether")
        );
        const tokenAddr = eventData._tokenAddr;
        alert(`
          Swap successful! \n
          Token address: ${tokenAddr} \n
          Amount: ${amountDisplay.toFixed(7)} ${token} \n
          Cost: ${costDisplay.toFixed(7)} ETH
        `);
        resolve();
      })
      .catch((err) => reject(err));
  });
}

async function sellToken() {
  //dexのコントラクトはユーザのトークンを動かすことになるのでallowanceがいる
  const allowance = await tokenInst.methods.allowance(user, dexAddr).call();
  if (parseInt(finalInput) > parseInt(allowance)) {
    try {
      await tokenInst.methods.approve(dexAddr, finalInput).send();
    } catch (err) {
      throw err;
    }
  }

  try {
    const tokenAddr = tokenInst._address;
    const sellTx = await dexInst.methods
      .sellToken(tokenAddr, finalInput, finalOutput)
      .send();
    const eventData = sellTx.events.sell.returnValues;
    const amountDisplay = parseFloat(
      web3.utils.fromWei(eventData._amount, "ether")
    );
    const costDisplay = parseFloat(
      web3.utils.fromWei(eventData._cost, "ether")
    );
    const _tokenAddr = eventData._tokenAddr;
    alert(`
        Swap successful!\n
        Token Address: ${_tokenAddr} \n
        Amount: ${amountDisplay.toFixed(7)} ETH\n
        Price: ${costDisplay.toFixed(7)} ${token}
      `);
  } catch (err) {
    throw err;
  }
}
