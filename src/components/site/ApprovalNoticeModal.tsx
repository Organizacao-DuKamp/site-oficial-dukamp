import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

export function ApprovalNoticeModal() {
  const { approvalNotice, dismissApprovalNotice } = useAuth();
  const open = !!approvalNotice;
  const label = approvalNotice === "empresa" ? "Empresa" : "Produtor Rural";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismissApprovalNotice(); }}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 grid place-items-center mb-2">
            <PartyPopper className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Sua conta foi aprovada!</DialogTitle>
          <DialogDescription className="text-center">
            A Equipe Dukamp analisou e aprovou sua solicitação. Sua conta agora é{" "}
            <span className="font-semibold text-foreground">{label}</span> e você já pode aproveitar
            os preços e vantagens exclusivos do seu tipo de conta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => dismissApprovalNotice()}>Começar a aproveitar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
