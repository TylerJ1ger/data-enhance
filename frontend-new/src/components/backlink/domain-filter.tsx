//frontend-new/src/components/backlink/domain-filter.tsx
"use client";

import { useState } from 'react';
import { Search, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DomainFilterResponse } from "@/types";

interface DomainFilterProps {
  onFilter: (domain: string) => void;
  results: DomainFilterResponse | null;
  isLoading: boolean;
  disabled?: boolean;
}

export function DomainFilter({
  onFilter,
  results,
  isLoading,
  disabled = false,
}: DomainFilterProps) {
  const [domain, setDomain] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      onFilter(domain.trim());
    }
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>域名筛选</CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex space-x-2">
            <div className="flex-grow">
              <Input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="输入域名..."
                disabled={disabled || isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={disabled || isLoading || !domain.trim()}
              variant="default"
            >
              {isLoading ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              搜索
            </Button>
          </div>
        </form>
        
        {isLoading && (
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-[300px] w-full rounded-md" />
          </div>
        )}
        
        {!isLoading && results && (
          <div>
            {results.results.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                未找到匹配的域名数据
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2 flex items-center">
                  共找到 <Badge variant="secondary" className="ml-1 mr-1">{results.results.length}</Badge> 条
                  <span className="font-medium mx-1">"{domain}"</span>
                  域名数据
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>品牌</TableHead>
                        <TableHead>域名</TableHead>
                        <TableHead>域名权重</TableHead>
                        <TableHead>外链数</TableHead>
                        <TableHead>IP地址</TableHead>
                        <TableHead>国家</TableHead>
                        <TableHead>首次发现</TableHead>
                        <TableHead>最后发现</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.results.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.brand}</TableCell>
                          <TableCell className="text-primary">
                            <a 
                              href={item.domain.startsWith('http') ? item.domain : `https://${item.domain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {item.domain}
                            </a>
                          </TableCell>
                          <TableCell>
                            {item.domain_ascore !== undefined && item.domain_ascore !== null 
                              ? item.domain_ascore 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {item.backlinks !== undefined && item.backlinks !== null 
                              ? item.backlinks.toLocaleString() 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {item.ip_address || '-'}
                          </TableCell>
                          <TableCell>
                            {item.country || '-'}
                          </TableCell>
                          <TableCell>
                            {item.first_seen || '-'}
                          </TableCell>
                          <TableCell>
                            {item.last_seen || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    {results.results.length === 0 && (
                      <TableCaption>无匹配数据</TableCaption>
                    )}
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}