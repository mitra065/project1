import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { formatDate } from "../lib/utils";
import { queryClient } from "../lib/queryClient";
import { Lob, Loc, HolidayType, Holiday } from "../lib/types";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { toast } = useToast();
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(tomorrow);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [holidayType, setHolidayType] = useState<HolidayType>("NATIONAL");
  const [selectedLob, setSelectedLob] = useState<number | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<number | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Fetch LOBs and LOCs
  const { data: lobs = [] } = useQuery<Lob[]>({
    queryKey: ["/api/lobs"],
  });
  
  const { data: locs = [] } = useQuery<Loc[]>({
    queryKey: ["/api/locs"],
  });
  
  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: async (newHoliday: Omit<Holiday, "id">) => {
      const response = await fetch("/api/holidays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newHoliday),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create holiday");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setSelectedDate(tomorrow);
      setHolidayName("");
      setHolidayDescription("");
      setHolidayType("NATIONAL");
      setSelectedLob(null);
      setSelectedLoc(null);
      
      // Invalidate holiday queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      
      // Show success message
      toast({
        title: "Holiday Created",
        description: "The holiday has been successfully added to the calendar.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Holiday",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for the holiday.",
        variant: "destructive",
      });
      return;
    }
    
    if (!holidayName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the holiday.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if date is in the future
    if (selectedDate < today) {
      toast({
        title: "Invalid Date",
        description: "Please select a future date for the holiday.",
        variant: "destructive",
      });
      return;
    }
    
    const newHoliday = {
      name: holidayName,
      date: selectedDate,
      description: holidayDescription || undefined,
      type: holidayType,
      lobId: selectedLob,
      locId: selectedLoc
    };
    
    createHolidayMutation.mutate(newHoliday);
  };
  
  // Filter out past dates from the calendar
  const disableOldDates = (date: Date) => {
    return date < today;
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Holiday Administration</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Holiday</CardTitle>
          <CardDescription>
            Create a new holiday by selecting a future date and filling out the details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="date">Date (Future dates only)</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate) : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setIsDatePickerOpen(false);
                    }}
                    disabled={disableOldDates}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Holiday Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Holiday Name</Label>
              <Input
                id="name"
                placeholder="e.g., New Year's Day"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                required
              />
            </div>
            
            {/* Holiday Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter a description of the holiday..."
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Holiday Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Holiday Type</Label>
              <Select
                value={holidayType}
                onValueChange={(value) => setHolidayType(value as HolidayType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select holiday type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATIONAL">National Holiday</SelectItem>
                  <SelectItem value="REGIONAL">Regional Holiday</SelectItem>
                  <SelectItem value="OBSERVANCE">Observance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* LOB Selection */}
            <div className="space-y-2">
              <Label htmlFor="lob">Line of Business (Optional)</Label>
              <Select
                value={selectedLob?.toString() || "0"}
                onValueChange={(value) => setSelectedLob(value === "0" ? null : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select LOB" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (All LOBs)</SelectItem>
                  {lobs.map((lob) => (
                    <SelectItem key={lob.id} value={lob.id.toString()}>
                      {lob.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* LOC Selection */}
            <div className="space-y-2">
              <Label htmlFor="loc">Location (Optional)</Label>
              <Select
                value={selectedLoc?.toString() || "0"}
                onValueChange={(value) => setSelectedLoc(value === "0" ? null : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select LOC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (All Locations)</SelectItem>
                  {locs.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={createHolidayMutation.isPending}
            >
              {createHolidayMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Holiday
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}