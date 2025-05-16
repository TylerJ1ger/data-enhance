//frontend-new/src/app/(dashboard)/backlink/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BacklinkLoading() {
  return (
    <div className="space-y-6">
      {/* 操作栏骨架屏 */}
      <div className="flex flex-wrap gap-4 justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 主面板骨架屏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧筛选面板 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full" />
                <div className="flex space-x-4 pt-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧内容区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 外链统计信息骨架屏 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/10 rounded-lg border p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="bg-muted/10 rounded-lg border p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="bg-muted/10 rounded-lg border p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 域名分布图表骨架屏 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-72 w-full" />
              <div className="mt-4 flex justify-center">
                <Skeleton className="h-8 w-64" />
              </div>
            </CardContent>
          </Card>

          {/* 域名筛选骨架屏 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-4">
                <Skeleton className="h-10 flex-grow" />
                <Skeleton className="h-10 w-20" />
              </div>
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>

          {/* 品牌域名重叠分析骨架屏 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-full mb-4" />
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-20 w-full mt-4 rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}