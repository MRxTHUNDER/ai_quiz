import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Loader2,
  UserCheck,
  Mail,
  Calendar,
  Phone,
  Download,
  Filter,
  X,
} from "lucide-react";
import { usersApi, User } from "@/lib/users";
import { getAllEntranceExams, EntranceExam } from "@/lib/entranceExams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportUsersToExcel } from "@/lib/excelUtils";

function UsersManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Form values (not applied until Filter button is clicked)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  // Applied filter values (used for actual filtering)
  const [appliedSearchTerm, setAppliedSearchTerm] = useState<string>("");
  const [appliedSelectedExam, setAppliedSelectedExam] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");
  const [entranceExams, setEntranceExams] = useState<EntranceExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [exporting, setExporting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await usersApi.getAllUsers({
        page: currentPage,
        limit: 10,
        search: appliedSearchTerm || undefined,
        entranceExamId: appliedSelectedExam || undefined,
        startDate: appliedStartDate || undefined,
        endDate: appliedEndDate || undefined,
      });
      setUsers(result.users);
      setPagination(result.pagination);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          "Failed to load users. Please try again."
      );
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntranceExams();
  }, []);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    appliedSearchTerm,
    appliedSelectedExam,
    appliedStartDate,
    appliedEndDate,
  ]);

  const loadEntranceExams = async () => {
    try {
      setLoadingExams(true);
      const exams = await getAllEntranceExams();
      setEntranceExams(exams);
    } catch (err) {
      console.error("Error loading entrance exams:", err);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply search term immediately for search functionality
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    // Apply all filter values when Filter button is clicked
    setAppliedSearchTerm(searchTerm);
    setAppliedSelectedExam(selectedExam);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedExam("");
    setStartDate("");
    setEndDate("");
    // Also clear applied filters
    setAppliedSearchTerm("");
    setAppliedSelectedExam("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    appliedSearchTerm ||
    appliedSelectedExam ||
    appliedStartDate ||
    appliedEndDate;

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  const handleExportToExcel = async () => {
    try {
      setExporting(true);
      // Fetch all users for export with applied filters
      const allUsers = await usersApi.getAllUsersForExport(
        appliedSearchTerm || undefined,
        undefined,
        appliedSelectedExam || undefined,
        appliedStartDate || undefined,
        appliedEndDate || undefined
      );

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `users-export-${timestamp}.xlsx`;

      // Export to Excel
      exportUsersToExcel(allUsers, filename);
    } catch (err: unknown) {
      console.error("Error exporting users:", err);
      alert("Failed to export users. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-600 mt-2">
          View and manage all users and their test progress
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Search and filter users by name or email
              </CardDescription>
            </div>
            <Button
              onClick={handleExportToExcel}
              disabled={exporting}
              variant="outline"
              className="gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export to Excel
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="mb-6 space-y-4">
            {/* Search by name or email */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Exam/Quiz Type
                </label>
                <Select
                  value={selectedExam ? selectedExam : "all"}
                  onValueChange={(value) => {
                    setSelectedExam(value === "all" ? "" : value);
                  }}
                  disabled={loadingExams}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Exams/Quizzes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exams/Quizzes</SelectItem>
                    {entranceExams.map((exam) => (
                      <SelectItem key={exam._id} value={exam._id}>
                        {exam.entranceExamName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                  }}
                  min={startDate || undefined}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 opacity-0 pointer-events-none">
                  <Filter className="h-4 w-4" />
                  Filter
                </label>
                <Button
                  type="button"
                  onClick={handleApplyFilters}
                  variant="outline"
                  className="h-9 w-20"
                >
                  <Filter className="h-4 w-4 mr-1.5" />
                  Filter
                </Button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </form>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleUserClick(user._id)}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserCheck className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {user.firstname} {user.lastname || ""}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {user.email}
                            </div>
                            {user.phoneNumber && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {user.phoneNumber}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      currentPage * pagination.limit,
                      pagination.totalCount
                    )}{" "}
                    of {pagination.totalCount} users
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(pagination.totalPages, p + 1)
                        )
                      }
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UsersManagement;
