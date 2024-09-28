import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function TransactionDialog({ open, children, title, contentText, handleBack,handleState, state }) {
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
        <Button onClick={handleBack}>Go to coin Store</Button>

        <Button onClick={handleState}>{state}</Button>
      </DialogActions>
    </Dialog>
  );
}