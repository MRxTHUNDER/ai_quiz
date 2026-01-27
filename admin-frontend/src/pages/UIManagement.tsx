import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUIFlags, updateUIFlags, type UIFlags } from "@/lib/uiFlags";
import { Loader2 } from "lucide-react";

export default function UIManagement() {
  const [flags, setFlags] = useState<UIFlags>({
    questionsPageEnabled: true,
    featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUIFlags();
      // Ensure data is valid before setting
      if (data && typeof data === 'object') {
        setFlags({
          questionsPageEnabled: data.questionsPageEnabled ?? true,
          featuredExamNames: data.featuredExamNames && data.featuredExamNames.length > 0
            ? data.featuredExamNames
            : ["JEE", "NEET", "CET", "CUET"],
        });
      } else {
        // Fallback to default if data is invalid
        setFlags({
          questionsPageEnabled: true,
          featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
        });
      }
    } catch (err) {
      console.error("Error loading UI flags:", err);
      setError("Failed to load UI flags");
      // Set default flags on error
      setFlags({
        questionsPageEnabled: true,
        featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field: keyof UIFlags, value: boolean) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Ensure flags is defined before spreading
      const currentFlags =
        flags || {
          questionsPageEnabled: true,
          featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
        };
      const updatedFlags = { ...currentFlags, [field]: value };
      await updateUIFlags(updatedFlags);
      setFlags(updatedFlags);
      setSuccess("UI flags updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error updating UI flags:", err);
      setError("Failed to update UI flags");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>UI Management</CardTitle>
          <CardDescription>
            Control visibility and access to UI components and pages for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-md bg-green-50 text-green-800 text-sm">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Questions Page Toggle */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5 flex-1">
                <Label className="text-base font-semibold">
                  Questions Page
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the Questions page in the user frontend. When
                  disabled, users will not be able to access or see the Questions
                  tab.
                </p>
              </div>
              <div className="ml-4">
                <Button
                  variant={flags?.questionsPageEnabled === false ? "destructive" : "default"}
                  size="sm"
                  onClick={() =>
                    handleToggle("questionsPageEnabled", !(flags?.questionsPageEnabled ?? true))
                  }
                  disabled={saving}
                  className={
                    flags?.questionsPageEnabled === false
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }
                >
                  {flags?.questionsPageEnabled === false ? "Disabled" : "Enabled"}
                </Button>
              </div>
            </div>
          </div>

          {/* Featured Exam Names Configuration */}
          <div className="p-4 border rounded-lg">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">
                  Featured Exams (Home Page Text)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Configure up to four entrance exams that appear in the
                  marketing text on the user Home page (e.g.{" "}
                  <span className="font-semibold">
                    JEE, NEET, CET, or CUET aspirant
                  </span>
                  ).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-sm">Exam {index + 1}</Label>
                    <Input
                      placeholder={
                        index === 0
                          ? "JEE"
                          : index === 1
                          ? "NEET"
                          : index === 2
                          ? "CET"
                          : "CUET"
                      }
                      value={flags.featuredExamNames?.[index] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const current = flags.featuredExamNames ?? [
                          "JEE",
                          "NEET",
                          "CET",
                          "CUET",
                        ];
                        const updated = [...current];
                        updated[index] = value;
                        setFlags((prev) => ({
                          ...(prev || {
                            questionsPageEnabled: true,
                            featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
                          }),
                          featuredExamNames: updated,
                        }));
                      }}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      setSaving(true);
                      setError(null);
                      setSuccess(null);
                      const current = flags.featuredExamNames ?? [
                        "JEE",
                        "NEET",
                        "CET",
                        "CUET",
                      ];
                      const cleaned = current
                        .map((name) => name.trim())
                        .filter((name) => name.length > 0)
                        .slice(0, 4);
                      const updated = await updateUIFlags({
                        ...flags,
                        featuredExamNames: cleaned,
                      });
                      setFlags((prev) => ({
                        ...(prev || {
                          questionsPageEnabled: true,
                          featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
                        }),
                        featuredExamNames:
                          updated.featuredExamNames && updated.featuredExamNames.length > 0
                            ? updated.featuredExamNames
                            : ["JEE", "NEET", "CET", "CUET"],
                      }));
                      setSuccess("Featured exams updated successfully");
                      setTimeout(() => setSuccess(null), 3000);
                    } catch (err) {
                      console.error("Error updating featured exams:", err);
                      setError("Failed to update featured exams");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Featured Exams"}
                </Button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Changes take effect immediately. When a
              page is disabled, users will not see the navigation link and
              cannot access the page even if they know the URL.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
