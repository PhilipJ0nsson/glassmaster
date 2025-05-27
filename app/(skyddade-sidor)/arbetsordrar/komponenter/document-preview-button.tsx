// File: app/(skyddade-sidor)/arbetsordrar/komponenter/offert-preview.tsx
// Mode: Moving and Modifying
// Old Path: app/(skyddade-sidor)/arbetsordrar/komponenter/offert-preview.tsx
// New Path: app/(skyddade-sidor)/arbetsordrar/komponenter/document-preview-button.tsx
// Change: Renaming and generalizing the component to handle different document types.
// Reasoning: To allow preview and download of Offert, Arbetsorder, and Faktura PDFs.
// --- start diff ---
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
import { DocumentType } from "@/lib/pdf-generator"; // Importera DocumentType
import { FileText, Mail, Download, Loader2 } from "lucide-react"; // Lade till Loader2
import { useState } from "react";
// PDFViewer och StyleSheet tas bort då PDF:en visas i en iframe
import { toast } from "sonner";

interface DocumentPreviewButtonProps {
  arbetsorderId: number;
  documentType: DocumentType;
  buttonText: string;
  dialogTitle: string;
  isDisabled?: boolean; // För att kunna inaktivera t.ex. Faktura-knappen
}

export default function DocumentPreviewButton({ 
  arbetsorderId, 
  documentType,
  buttonText,
  dialogTitle,
  isDisabled = false,
}: DocumentPreviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false); // Egen state för e-postladdning

  const pdfUrl = `/api/arbetsordrar/${arbetsorderId}/pdf?type=${documentType}`;
  const downloadUrl = `/api/arbetsordrar/${arbetsorderId}/pdf?type=${documentType}&download=true`;

  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
    setIsOpen(false);
  };

  const handleSendEmail = async () => {
    setIsLoadingEmail(true);
    try {
      const response = await fetch(`/api/arbetsordrar/${arbetsorderId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Skicka med info som behövs för e-post, t.ex. kundens e-post
        // Detta behöver anpassas baserat på hur API:et förväntar sig data
        body: JSON.stringify({ 
            to: 'kundens.epost@example.com', // Detta behöver hämtas dynamiskt
            subject: `${dialogTitle} #${arbetsorderId}`,
            documentType: documentType 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 501) { // Not Implemented
            toast.info(errorData.message || "E-postfunktionalitet är inte implementerad än.");
        } else {
            throw new Error(errorData.error || "Kunde inte skicka e-post.");
        }
      } else {
        const result = await response.json();
        if (result.success) {
            toast.success("E-post skickat!");
        } else {
             toast.info(result.message || "E-postfunktionalitet är inte implementerad än.");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Kunde inte skicka e-post");
      console.error("Error sending email:", error);
    } finally {
      setIsLoadingEmail(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="text-blue-600 hover:bg-blue-50" // Kan anpassas per knapp om så önskas
          disabled={isDisabled}
        >
          <FileText className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[95vh] max-h-screen sm:max-w-[950px] w-full flex flex-col"> {/* Lade till flex flex-col */}
        <DialogHeader>
          <DialogTitle>
            {dialogTitle} #{arbetsorderId}
          </DialogTitle>
          <DialogDescription>
            Här kan du förhandsgranska, ladda ner eller skicka dokument via e-post.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden flex justify-center my-4"> {/* Lade till flex-grow och my-4 */}
          <iframe 
            src={pdfUrl}
            className="w-full h-full max-w-[800px] border rounded shadow-md bg-gray-50" // Anpassad för att fylla utrymmet bättre
            title={`${dialogTitle} förhandsgranskning`}
          />
        </div>
        
        <DialogFooter className="flex flex-row justify-between items-center pt-4 border-t"> {/* Behåll flex-row, justera items-center */}
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
              disabled={isLoadingEmail}
            >
              {isLoadingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
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
// --- end diff ---