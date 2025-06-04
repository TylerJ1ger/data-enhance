//frontend/src/app/(dashboard)/schema/loading.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function SchemaLoading() {
  return (
    <div className="space-y-6">
      {/* 页面标题骨架 */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-80" /> {/* 主标题 */}
          <Skeleton className="h-5 w-96" /> {/* 副标题 */}
        </div>
        <Skeleton className="h-6 w-32" /> {/* API版本标识 */}
      </div>
      
      <Separator />
      
      {/* 操作栏骨架 */}
      <div className="flex flex-wrap gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-16" /> {/* 预览按钮 */}
          <Skeleton className="h-9 w-16" /> {/* 生成按钮 */}
          <Skeleton className="h-9 w-16" /> {/* 验证按钮 */}
          <Skeleton className="h-9 w-16" /> {/* 复制按钮 */}
          <Skeleton className="h-9 w-16" /> {/* 下载按钮 */}
          <Skeleton className="h-9 w-20" /> {/* 保存配置按钮 */}
        </div>
        <Skeleton className="h-9 w-16" /> {/* 重置按钮 */}
      </div>
      
      {/* 类型选择器骨架 */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" /> {/* 标题 */}
            <Skeleton className="h-4 w-80" /> {/* 描述 */}
          </div>
        </CardHeader>
        <CardContent>
          {/* 类型卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="h-10 w-10 rounded-lg" /> {/* 图标 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" /> {/* 类型名称 */}
                        <Skeleton className="h-5 w-12 rounded-full" /> {/* 徽章 */}
                      </div>
                      <Skeleton className="h-3 w-full" /> {/* 描述第一行 */}
                      <Skeleton className="h-3 w-3/4" /> {/* 描述第二行 */}
                      <div className="flex gap-1 mt-2">
                        <Skeleton className="h-4 w-16 rounded-full" /> {/* 必填字段徽章 */}
                        <Skeleton className="h-4 w-16 rounded-full" /> {/* 可选字段徽章 */}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* 选中类型详情骨架 */}
          <div className="mt-6 p-4 bg-primary/5 rounded-lg border space-y-3">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6" /> {/* 图标 */}
              <Skeleton className="h-5 w-32" /> {/* 类型名称 */}
            </div>
            <Skeleton className="h-4 w-full" /> {/* 描述 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" /> {/* "必填字段:" */}
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" /> {/* "可选字段:" */}
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-18 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 主内容区域骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧 - 表单和配置管理 */}
        <div className="space-y-6">
          {/* 表单区域骨架 */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" /> {/* "数据输入" */}
              <Skeleton className="h-4 w-48" /> {/* 描述 */}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 表单字段骨架 */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-24" /> {/* 标签 */}
                    <Skeleton className="h-3 w-3 rounded-full" /> {/* 必填标识 */}
                    <Skeleton className="h-3 w-3 rounded-full" /> {/* 帮助图标 */}
                  </div>
                  <Skeleton className="h-10 w-full" /> {/* 输入框 */}
                </div>
              ))}
              
              {/* 数组字段骨架 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4" /> {/* 展开图标 */}
                    <Skeleton className="h-4 w-20" /> {/* 字段名 */}
                    <Skeleton className="h-4 w-8 rounded-full" /> {/* 项目数量徽章 */}
                  </div>
                  <Skeleton className="h-8 w-16" /> {/* 添加按钮 */}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 配置管理骨架 */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" /> {/* "配置管理" */}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 搜索框骨架 */}
              <div className="relative">
                <Skeleton className="h-10 w-full" />
              </div>
              
              {/* 配置列表骨架 */}
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-32" /> {/* 配置名称 */}
                            <Skeleton className="h-4 w-12 rounded-full" /> {/* 类型徽章 */}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-3 w-3" /> {/* 日历图标 */}
                            <Skeleton className="h-3 w-24" /> {/* 日期 */}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Skeleton className="h-8 w-8" /> {/* 加载按钮 */}
                          <Skeleton className="h-8 w-8" /> {/* 更多按钮 */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* 当前状态骨架 */}
              <div className="p-3 bg-primary/5 rounded-lg border space-y-2">
                <Skeleton className="h-4 w-20" /> {/* "当前配置" */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-40" /> {/* 配置详情 */}
                  <Skeleton className="h-4 w-12 rounded-full" /> {/* 状态徽章 */}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 验证结果骨架 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-20" /> {/* "数据验证" */}
                  <Skeleton className="h-4 w-12 rounded-full" /> {/* 状态徽章 */}
                </div>
                <Skeleton className="h-8 w-20" /> {/* 重新验证按钮 */}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-start space-x-3">
                  <Skeleton className="h-5 w-5 rounded-full" /> {/* 状态图标 */}
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" /> {/* 状态标题 */}
                    <Skeleton className="h-3 w-full" /> {/* 状态描述 */}
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <Skeleton className="h-4 w-4" /> {/* 错误图标 */}
                        <Skeleton className="h-3 w-16" /> {/* 错误计数 */}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Skeleton className="h-4 w-4" /> {/* 警告图标 */}
                        <Skeleton className="h-3 w-16" /> {/* 警告计数 */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 右侧 - 预览和输出 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" /> {/* "预览和输出" */}
            </CardHeader>
            <CardContent>
              {/* 标签页骨架 */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
                  <Skeleton className="h-8 w-full rounded-md" /> {/* 表单标签 */}
                  <Skeleton className="h-8 w-full rounded-md" /> {/* 预览标签 */}
                  <Skeleton className="h-8 w-full rounded-md" /> {/* 输出标签 */}
                </div>
                
                {/* 内容区域骨架 */}
                <div className="space-y-4">
                  {/* 格式选择器骨架 */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1 p-1 bg-muted rounded-lg">
                      <Skeleton className="h-8 w-20 rounded-md" /> {/* JSON-LD */}
                      <Skeleton className="h-8 w-24 rounded-md" /> {/* HTML Script */}
                    </div>
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-16" /> {/* 复制按钮 */}
                      <Skeleton className="h-8 w-16" /> {/* 下载按钮 */}
                    </div>
                  </div>
                  
                  {/* 代码预览区域骨架 */}
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-24" /> {/* 格式标题 */}
                          <Skeleton className="h-4 w-12 rounded-full" /> {/* 文件扩展名 */}
                        </div>
                        <Skeleton className="h-3 w-32" /> {/* 行数和字符数 */}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <Skeleton 
                            key={i} 
                            className="h-4" 
                            style={{ width: `${Math.random() * 40 + 40}%` }} 
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 使用说明骨架 */}
                  <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4" /> {/* 信息图标 */}
                      <Skeleton className="h-4 w-20" /> {/* 标题 */}
                    </div>
                    <Skeleton className="h-3 w-full" /> {/* 说明文字 */}
                    <Skeleton className="h-3 w-3/4" /> {/* 说明文字第二行 */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}