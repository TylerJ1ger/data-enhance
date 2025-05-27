//frontend/src/app/(dashboard)/orders/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      {/* 页面标题区域骨架 */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      
      <Separator />
      
      {/* 操作栏骨架 */}
      <div className="flex flex-wrap gap-4 justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      
      {/* 数据生成器骨架 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-end">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          {/* 提示信息骨架 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 主要内容骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧筛选面板骨架 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 日期范围 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              
              {/* 分隔线 */}
              <Skeleton className="h-px w-full" />
              
              {/* 筛选选项组 */}
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="space-y-2 max-h-32">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-px w-full" />
                </div>
              ))}
              
              {/* 滑块筛选 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-full" />
              </div>
              
              <Skeleton className="h-px w-full" />
              
              {/* 下拉选择 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <Skeleton className="h-px w-full" />
              
              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-12" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧内容区域骨架 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 统计卡片骨架 */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 第一行统计 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-2">
                        <Skeleton className="h-5 w-5 mr-2" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="flex justify-between items-end">
                        <Skeleton className="h-8 w-16" />
                        <div className="text-sm">
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* 第二行统计 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-2">
                        <Skeleton className="h-5 w-5 mr-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="flex justify-between items-end">
                        <Skeleton className="h-8 w-20" />
                        <div className="text-sm">
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* 数据摘要提示骨架 */}
          <div className="border rounded-lg p-4">
            <Skeleton className="h-4 w-full" />
          </div>
          
          {/* 图表区域骨架 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              {/* 标签页骨架 */}
              <div className="grid grid-cols-3 gap-1 mb-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              {/* 图表网格骨架 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-80 w-full border rounded-lg flex items-center justify-center bg-muted/10">
                    <div className="text-center space-y-2">
                      <Skeleton className="h-12 w-12 mx-auto rounded-full" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                      <Skeleton className="h-3 w-16 mx-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}