'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArbetsorderStatus } from "@prisma/client";
import { FileText, Mail, Download } from "lucide-react";
import { useState } from "react";
import { PDFViewer, StyleSheet } from '@react-pdf/renderer';
import { toast } from "sonner";

// Ta bort custom styles

interface OffertPreviewProps {
  arbetsorderId: number;
  status: ArbetsorderStatus;
}

export default function OffertPreview({ arbetsorderId, status }: OffertPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = () => {
    window.open(`/api/arbetsordrar/${arbetsorderId}/offert?download=true`, '_blank');
    setIsOpen(false);
  };

  const handleSendEmail = async () => {
    setIsLoading(true);
    try {
      // Not implemented yet
      toast.info("E-postfunktionalitet kommer snart!");
    } catch (error) {
      toast.error("Kunde inte skicka e-post");
      console.error("Error sending email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="text-blue-600 hover:bg-blue-50"
        >
          <FileText className="mr-2 h-4 w-4" />
          Visa {status === ArbetsorderStatus.OFFERT ? 'offert' : 'PDF'}
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[95vh] max-h-screen sm:max-w-[950px] w-full">
        <DialogHeader>
          <DialogTitle>
            {status === ArbetsorderStatus.OFFERT ? 'Offert' : 'Arbetsorder'} #{arbetsorderId}
          </DialogTitle>
          <DialogDescription>
            Här kan du förhandsgranska, ladda ner eller skicka dokument via e-post.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex justify-center">
          <iframe 
            src={`/api/arbetsordrar/${arbetsorderId}/offert`}
            className="w-[800px] h-[80vh] border rounded shadow-md bg-gray-50"
          />
        </div>
        
        <DialogFooter className="flex flex-row justify-between">
          <div className="flex gap-2">
            <Button 
              onClick={handleDownload}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Ladda ner
            </Button>
            <Button 
              onClick={handleSendEmail}
              variant="outline"
              disabled={isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              Skicka via e-post
            </Button>
          </div>
          <Button 
            onClick={() => setIsOpen(false)}
          >
            Stäng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}