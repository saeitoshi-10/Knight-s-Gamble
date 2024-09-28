import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function StoreDialog({ open, children, title, contentText, handleBuyBack,handleSellMain,Close,getBalance }) {
  return (
    <Dialog open={open}> {}
      <DialogTitle>{title}</DialogTitle>
      <DialogContent> {}
        <DialogContentText> {}
          {contentText}
        </DialogContentText>
        {children} {}
      </DialogContent>
      <DialogActions> {}
        {}
        {}
        <Button onClick={handleBuyBack}>Buy</Button>

        <Button onClick={handleSellMain}>Sell</Button>
        <Button onClick={Close}>Close</Button>
        <Button onClick={getBalance}>Balance</Button>
      </DialogActions>
    </Dialog>
  );
}