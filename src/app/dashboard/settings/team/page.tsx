"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTeamMembers } from "@/lib/query/settings";

export default function TeamSettingsPage() {
  const { data: members, isLoading } = useTeamMembers();

  return (
    <Card className="border-border/80">
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {members?.map((member) => (
              <TableRow key={member.user_id}>
                <TableCell className="font-mono text-xs">{member.user_id}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{member.role}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{new Date(member.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
