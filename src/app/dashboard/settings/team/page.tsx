"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useTeamMembers } from "@/lib/query/settings";

export default function TeamSettingsPage() {
  const { data: members, isLoading } = useTeamMembers();

  return (
    <>
      <PageHeaderBar title="Team" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow="Access" title="Your team" description="Members and roles for this workspace." />
        <Card className="mt-8 border-border/80">
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
      </main>
    </>
  );
}
