// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

contract ERC20 {
    //publicをつけることで外から呼べるからわざわざ関数を書かなくて良い
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    //アドレスを入れたらその人の残高が返ってくる
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    constructor(string memory _name, string memory _symbol, uint256 _totalSupply){
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        //トークンを誰も持っていないことになると困るので渡す
        balances[msg.sender]= totalSupply;
        //ミントする際は差出人はアドレス０とよく書く
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    //外部でしか見ないのでexternal
    function balanceOf(address _owner) external view returns (uint256) {
        return balances[_owner];
    }

    //ownerの資金をどれだけスペンダーが使っていいのかが見られる
    function allowance(address _owner, address _spender)
        public
        view
        returns (uint256)
    {return allowances[_owner][_spender];}

    //transfer
    function transfer(address _to, uint256 _value) external returns (bool) {
        _transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external returns (bool) {
        //fromのものをmsg.senderが送る
        require(allowances[_from][msg.sender] >= _value, "Transfer amount exceeds allowance");
        _transfer(_from, _to, _value);
        //送ったらOKな量が減る
        allowances[_from][msg.sender] -= _value;
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        //送り手がスペンダーにどれだけ使っていいかをきめる
        allowances[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    //_transferを作ってtransferとtransferFromの共通部分をつくる
    function _transfer(
        address _from,
        address _to,
        uint256 _value
    ) private {
        //遅れるかどうかを確かめる
        require(_value <= balances[_from], "Insufficient balance");
        //fromとtoが一致しないか
        require(_from != _to, "from = to");
        balances[_from] -= _value;
        balances[_to] += _value;
        //transferはemitいる
        emit Transfer(_from, _to, _value);
    }
}
