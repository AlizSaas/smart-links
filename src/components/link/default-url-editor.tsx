import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit3, Check, X } from "lucide-react"; // ✅ Add X icon
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateLinkDestinations } from "@/data/links/link-functions";
import { DestinationsSchemaType } from "@/zod/links";

interface DefaultUrlEditorProps {
  destinations: DestinationsSchemaType;
  linkId: string;
  label?: string;
  description?: string;
  onSave?: (url: string) => void;
}

export function DefaultUrlEditor({
  destinations,
  linkId,
  label = "Default URL",
  description = "This URL will be used for visitors from countries not listed below",
  onSave,
}: DefaultUrlEditorProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(destinations.default);

  const updateDestinationMutation = useMutation({
    mutationFn: (newUrl: string) =>
      updateLinkDestinations({
        data: {
          linkId,
          destinations: {
            ...destinations,
            default: newUrl,
          },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link", linkId] });
      queryClient.invalidateQueries({ queryKey: ["links"] });
      toast.success("Default URL updated");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Failed to update default URL");
    },
  });

  const handleSave = () => {
    if (!url || !isValidUrl(url)) {
      toast.error("Please enter a valid URL");
      return;
    }
    updateDestinationMutation.mutate(url);
    onSave?.(url);
  };

  const handleCancel = () => {
    setUrl(destinations.default); // ✅ Reset to original value
    setIsEditing(false);
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="defaultUrl" className="text-sm font-medium">
        {label}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            id="defaultUrl"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 text-base flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              }
              if (e.key === "Escape") {
                handleCancel();
              }
            }}
          />
          <Button
            onClick={handleSave}
            size="sm"
            className="h-12 px-3"
            disabled={updateDestinationMutation.isPending}
          >
            <Check className="w-4 h-4" />
          </Button>
          {/* ✅ Add Cancel Button */}
          <Button
            onClick={handleCancel}
            size="sm"
            variant="ghost"
            className="h-12 px-3"
            disabled={updateDestinationMutation.isPending}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
          <code className="text-sm text-muted-foreground flex-1 truncate">
            {url}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 p-0"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}