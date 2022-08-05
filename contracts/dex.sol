// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;
import "./ERC20.sol";

contract Dex {

    //誰のアカウントか，どのトークンか，呼び出し手が払うイーサの値段，こちらが渡すトークンの個数
    event buy(address account,address _tokenAddr, uint256 _cost, uint256 _amount);
    event sell(address account,address _tokenAddr, uint256 _cost, uint256 _amount);

    mapping(address => bool) public supportedTokenAddr;

    //トークンのアドレスをmappingに突っ込んで有効かどうかをチェックする
    modifier suppportsToken(address _tokenAddr){
        require(supportedTokenAddr[_tokenAddr] == true, "This token is not supported");
        _;
    }

    //対応できるトークンのアドレスを限定する
    //最初にコンストラクタで対応予定のトークンアドレスのリストを受け取り，それをmappingに追加
    constructor(address[] memory _tokenAddr){
        for(uint i=0; i < _tokenAddr.length; i++){
            supportedTokenAddr[_tokenAddr[i]] = true;
        }
    }

    //トークンのアドレス（トークンごとにアドレスが存在する），払うイーサ，渡すトークンの個数
    function buyToken(address _tokenAddr, uint256 _cost, uint256 _amount) external payable suppportsToken(_tokenAddr){
        //外部のコントラクトをやり取りするときはinterfaceが必要
        //がわざわざつくらなくてもERC20をインポートすればよい．これがインターフェースみたいなものだから．
        //インスタンスを定義する
        ERC20 token = ERC20(_tokenAddr);
        //ユーザが払えるかどうかをチェック
        require(msg.value == _cost, "Insufficient fund" );
        //このDEXがトークンを渡せるかどうか
        require((token.balanceOf(address(this))) >= _amount, "Token sold out");
        //ユーザにトークンを送る
        token.transfer(msg.sender, _amount);
        // token.transferFrom(msg.sender, address(this), _cost);
        emit buy(msg.sender,_tokenAddr, _cost, _amount);
    }

    function sellToken(address _tokenAddr, uint256 _cost, uint256 _amount) external suppportsToken(_tokenAddr ){
        ERC20 token = ERC20(_tokenAddr);
        //ユーザが売るだけのトークンを持っているか確認
        require(token.balanceOf((msg.sender)) >= _cost, "Insufficient token balance");
        //このDEXがイーサを渡せるかどうか確認
        require(address(this).balance >= _amount, "Dex does not have enough funds");
        //ユーザがこちらにトークンを送る
        token.transferFrom(msg.sender, address(this), _cost);
        //ユーザにイーサを送る
        // token.transfer(msg.sender, _amount);
        (bool success,) = payable(msg.sender).call{value: _amount}("");
        require(success, "ETH transfer failed");
        emit buy(msg.sender,_tokenAddr, _cost, _amount);
    }
}