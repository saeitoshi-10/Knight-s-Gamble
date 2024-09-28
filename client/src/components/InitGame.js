/* eslint-disable no-undef */
import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import CustomDialog from "./CustomDialog";
import socket from "../socket";
import StoreDialog from './StoreDialog';
import TransactionDialog from "./TransactionSide";
import {ethers} from "ethers"
import token from "./MyToken.json"
const { v4: uuidV4 } = require('uuid');

const {ethereum} = window;

export default function InitGame({ setRoom, setOrientation, setPlayers }) {
    const abi = token.abi;
    const [roomDialogOpen, setRoomDialogOpen] = useState(false);
    const [roomInput, setRoomInput] = useState('');
    const [roomError, setRoomError] = useState('');
    const [coinStore, setcoinStore] = useState(false)
    const [StoreError, setStoreError] = useState(false)
    const [handleBuy, sethandleBuy] = useState(false)
    const [handleSell, setHandleSell] = useState(false)
    const [StoreInput, setStoreInput] = useState(0);
    const [createRoomTokenDialog, setCreateRoomTokenDialog] = useState(false);
    const [TokenValue, setTokenValue] = useState(0)
    const [TokenError, setTokenError] = useState("")
    
    return (
        <Stack
            justifyContent = "center"
            alignItems = "center"
            sx = {{ py: 1, height: "100vh" }}
        >
            <CustomDialog
                open = {roomDialogOpen}
                handleClose = {() => setRoomDialogOpen(false)}
                title = "Select Room to Join"
                contextText = "Enter a valid room ID to join"
                handleContinue = {async() => {
                    const provider = await new ethers.BrowserProvider(window.ethereum)
                    const signer = await provider.getSigner();
    
                    const contract =await new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
                    // joining a room
                    if (!roomInput && TokenValue <10) return; // if input is invalid
                    try{
                        await ethereum.request({
                            "method": "wallet_switchEthereumChain",
                            "params": [
                              {
                                "chainId": "0x7A69"
                              }
                            ]
                          });
                        const accounts = await ethereum.request({method: "eth_requestAccounts"})
                    const tx = await contract.receiveFunds(accounts[0],TokenValue,roomInput,0);
                    await tx.wait();
                    
                    }catch(error){
                        console.log(error);
                        setTokenError(error)
                        return
                    }
                    socket.emit("joinRoom", { roomId: roomInput }, (r) => {
                        // r = response from server (callback)
                        if (r.error) return setRoomError(r.message)
                        console.log(r.message); // error handling
                        console.log("response: ", r);
                        setRoom(r.roomId);
                        setPlayers(r.players);
                        setOrientation("black");
                        setRoomDialogOpen(false);
                    });
                }}
            >
                <TextField
                    autoFocus
                    margin="dense"
                    id="room"
                    label="Room ID"
                    name="room"
                    value={roomInput}
                    required
                    onChange={(e) => setRoomInput(e.target.value)}
                    type="text"
                    fullWidth
                    variant="standard"
                    error={Boolean(roomError)}
                    helperText={!roomError ? 'Enter a room ID' : `Invalid room ID: ${roomError}` }
                />
                <TextField
                    autoFocus
                    margin="dense"
                    id="Token "
                    label="Token Value To Bet"
                    name="token"
                    value={TokenValue}
                    required
                    onChange={(e) => setTokenValue(e.target.value)}
                    type="text"
                    fullWidth
                    variant="standard"
                    error={Boolean(TokenError)}
                    helperText={!TokenError ? 'Enter a room ID' : `Invalid room ID: ${TokenError}` }
                />
            </CustomDialog>
            <CustomDialog
                open = {createRoomTokenDialog}
                handleClose = {() => setCreateRoomTokenDialog(false)}
                title = "Please place your bets "
                contextText = "Enter a valid bet amount to join"
                handleContinue = {async () => {
                    const provider = new ethers.BrowserProvider(window.ethereum)
                    const signer = await provider.getSigner();
    
                    const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
                    const roomID = uuidV4();
                    try{
                        await ethereum.request({
                            "method": "wallet_switchEthereumChain",
                            "params": [
                              {
                                "chainId": "0x7A69"
                              }
                            ]
                          });
                        const accounts = await ethereum.request({method: "eth_requestAccounts"})
                    
                    const tx = await contract.receiveFunds(accounts[0],TokenValue,roomID,1);
                   const res = await tx.wait();
                
                    setStoreError(res)
                
                    
                   }
                    catch(error){
                        
                        setTokenError(error)
                        return
                    }
                    socket.emit("createRoom", roomID,(r) => {
                        console.log(r);
                        setRoom(r);
                        setOrientation("white");
                    })
                    setTokenError("")
                    setTokenValue(0)
                }}
            >
                <TextField
                    autoFocus
                    margin="dense"
                    id="room"
                    label="Token Value"
                    name="room"
                    value={TokenValue}
                    required
                    onChange={(e) => setTokenValue(e.target.value)}
                    type="text"
                    fullWidth
                    variant="standard"
                    error={Boolean(TokenError)}
                    helperText={!TokenError ? 'Enter a token' : `Invalid Tx: ${TokenError}` }
                />
            </CustomDialog>
            <StoreDialog
                open = {coinStore}
                handleClose = {() => setcoinStore(false)}
                title = "Welcome to The coin store  "
                contextText = "Please select if you want to buy or sell coins"
                handleBuyBack={()=>{
                    sethandleBuy(true)
                }}
                handleSellMain={()=>{
                    setHandleSell(true)
                }}
                Close={()=>{
                    setcoinStore(false)
                }}
                getBalance={async()=>{
                    const provider = new ethers.BrowserProvider(window.ethereum)
                    const signer = await provider.getSigner();
    
                    const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
                        await ethereum.request({
                            "method": "wallet_switchEthereumChain",
                            "params": [
                              {
                                "chainId": "0x7A69"
                              }
                            ]
                          });
                        const accounts = await ethereum.request({method: "eth_requestAccounts"})
                    try {
                        const tx = await contract.balanceOf(accounts[0])
                        const res = await tx.wait();
                        setStoreError(res)
                        console.log(res)
                      } catch (error) {
                        setStoreError(error)
                      }
                      setStoreInput(0);
                
                }}
            >
               
               
            </StoreDialog>
            <TransactionDialog
                open = {handleBuy}
                handleClose = {() => sethandleBuy(false)}
                title = "buy token "
                contextText = "please enter for tokens > 1"
                handleBack={()=>{
                    sethandleBuy(false)
                }}
                handleState={ async ()=>{
                    const provider = new ethers.BrowserProvider(window.ethereum)
                    const signer = await provider.getSigner();
    
                    const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
                    try {
                        
                                await ethereum.request({
                                    "method": "wallet_switchEthereumChain",
                                    "params": [
                                      {
                                        "chainId": "0x7A69"
                                      }
                                    ]
                                  });
                                const accounts = await ethereum.request({method: "eth_requestAccounts"})
                        const tx = await contract.deposit({ value:( ethers.parseEther(StoreInput)) })
                        await tx.wait();
                        console.log(tx); 
                        
                      } catch (error) {
                        setStoreError(error)
                      }
                }}
                state="Buy"
            >
                <TextField
                    autoFocus
                    margin="dense"
                    id="buy"
                    label="Enter tokens to Buy"
                    name="Token Buying center"
                    value={StoreInput}
                    required
                    onChange={(e) => setStoreInput(e.target.value)}
                    type="text"
                    fullWidth
                    variant="standard"
                    error={Boolean(StoreError)}
                    helperText={!StoreError ? "Your transaction is processing" : `Invalid transaction: ${StoreError}` }
                />
            </TransactionDialog>
            <TransactionDialog
                open = {handleSell}
                handleClose = {() => setHandleSell(false)}
                title = "Sell token "
                contextText = "please enter for tokens > 1"
                handleBack={()=>{
                    setHandleSell(false)
                }}
                handleState={ async ()=>{
                    const provider = new ethers.BrowserProvider(window.ethereum)
                    const signer =await provider.getSigner();
    
                    const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
                    try {
                        await ethereum.request({
                            "method": "wallet_switchEthereumChain",
                            "params": [
                              {
                                "chainId": "0x7A69"
                              }
                            ]
                          });
                        const accounts = await ethereum.request({method: "eth_requestAccounts"})
                        const tx = await contract.WithdrawCoin(accounts[0],StoreInput)
                        await tx.wait();
                        console.log(tx);
                        
                      } catch (error) {
                        setStoreError(error)
                      }
                      setStoreInput(0);
                }}
                state="Sell"
            >
                <TextField
                    autoFocus
                    margin="dense"
                    id="buy"
                    label="Enter tokens to Sell"
                    name="Token Selling center"
                    value={StoreInput}
                    required
                    onChange={(e) => setStoreInput(e.target.value)}
                    type="text"
                    fullWidth
                    variant="standard"
                    error={Boolean(StoreError)}
                    helperText={!StoreError ? "Your transaction is processing" : `Invalid transaction: ${StoreError}` }
                />
            </TransactionDialog>
            {/* Button for creating room */}
            <Button 
                variant = "contained"
                onClick={()=>{
                    setcoinStore(true)
                }}
            >
            Coin Store
            </Button>
            <Button
                variant = "contained"
                onClick = {async () => {
                    
                    setCreateRoomTokenDialog(true)
                }}
            >
                Create Room
            </Button>
            {/* Button for joining room */}
            <Button
                onClick = {() => {
                    setRoomDialogOpen(true);
                }}
            >
                Join Room
            </Button>
        </Stack>
    )
}