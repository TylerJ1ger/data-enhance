//frontend/src/components/orders/order-generator.tsx
"use client";

import React, { useState } from 'react';
import { Plus, Loader, Database, AlertCircle, Info, CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface OrderGeneratorProps {
  onGenerate: (count: number, dateRange: { startDate: Date; endDate: Date }) => Promise<void>;
  isGenerating: boolean;
  disabled?: boolean;
}

export function OrderGenerator({
  onGenerate,
  isGenerating,
  disabled = false,
}: OrderGeneratorProps) {
  const [count, setCount] = useState<number>(100);
  const [dateRange, setDateRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({
    startDate: new Date(2025, 3, 1), // 2025年4月1日
    endDate: new Date(2025, 4, 31),  // 2025年5月31日
  });
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证输入
    if (count <= 0) {
      setError('数据条数必须大于0');
      return;
    }
    
    if (count > 10000) {
      setError('数据条数不能超过10000');
      return;
    }

    // 验证日期范围
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('请选择完整的日期范围');
      return;
    }

    if (dateRange.startDate >= dateRange.endDate) {
      setError('开始日期必须早于结束日期');
      return;
    }

    // 检查日期范围不超过365天
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      setError('日期范围不能超过365天');
      return;
    }

    try {
      await onGenerate(count, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    } catch (error) {
      console.error('生成数据错误:', error);
      setError('生成数据失败，请重试');
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setCount(value);
    
    // 清除错误信息
    if (error) {
      setError('');
    }
  };

  // 预设数量选择
  const presetCounts = [50, 100, 500, 1000, 2000];

  const handlePresetClick = (presetCount: number) => {
    setCount(presetCount);
    if (error) {
      setError('');
    }
  };

  // 日期格式化辅助函数
  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 计算日期范围天数
  const calculateDaysDiff = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          虚拟订单数据生成器
        </CardTitle>
        <CardDescription>
          生成指定数量和时间范围的虚拟订单数据用于分析。数据包含订单号、用户ID、产品信息、支付信息等完整字段。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 🔧 优化后的响应式布局 */}
          <div className="w-full max-w-5xl mx-auto">
            {/* 主要内容区域 */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* 左侧表单区域 - 在大屏幕占3列 */}
              <div className="xl:col-span-3 space-y-6">
                {/* 数据条数和日期范围 - 在中等屏幕以上并排 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 数据条数设置 */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="count" className="text-sm font-medium">
                        数据条数
                      </Label>
                      <Input
                        id="count"
                        type="number"
                        value={count || ''}
                        onChange={handleCountChange}
                        placeholder="请输入要生成的订单数量"
                        min="1"
                        max="10000"
                        disabled={disabled || isGenerating}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        建议范围：100-1000 条（最多10000条）
                      </p>
                    </div>

                    {/* 快速选择预设数量 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">快速选择</Label>
                      <div className="flex flex-wrap gap-2">
                        {presetCounts.map((presetCount) => (
                          <Button
                            key={presetCount}
                            type="button"
                            variant={count === presetCount ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePresetClick(presetCount)}
                            disabled={disabled || isGenerating}
                            className="text-xs"
                          >
                            {presetCount}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* 🔧 日期范围设置 + 生成按钮 */}
                  <div className="space-y-4 flex flex-col justify-between">
                    {/* 日期范围选择器 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">订单时间范围</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 开始日期 */}
                        <div className="space-y-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !dateRange.startDate && "text-muted-foreground"
                                )}
                                disabled={disabled || isGenerating}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.startDate ? (
                                  formatDateDisplay(dateRange.startDate)
                                ) : (
                                  <span>选择开始日期</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={dateRange.startDate}
                                onSelect={(date) => {
                                  setDateRange(prev => ({ ...prev, startDate: date }));
                                  // Clear error when date is selected
                                  if (error) setError('');
                                }}
                                disabled={(date) => {
                                  // 修复：确保总是返回 boolean
                                  const today = new Date();
                                  if (date > today) return true;
                                  if (dateRange.endDate && date >= dateRange.endDate) return true;
                                  return false;
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Label className="text-xs text-muted-foreground">开始日期</Label>
                        </div>

                        {/* 结束日期 */}
                        <div className="space-y-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !dateRange.endDate && "text-muted-foreground"
                                )}
                                disabled={disabled || isGenerating}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.endDate ? (
                                  formatDateDisplay(dateRange.endDate)
                                ) : (
                                  <span>选择结束日期</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={dateRange.endDate}
                                onSelect={(date) => {
                                  setDateRange(prev => ({ ...prev, endDate: date }));
                                  // Clear error when date is selected
                                  if (error) setError('');
                                }}
                                disabled={(date) => {
                                  // 修复：确保总是返回 boolean
                                  const today = new Date();
                                  if (date > today) return true;
                                  if (dateRange.startDate && date <= dateRange.startDate) return true;
                                  return false;
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <Label className="text-xs text-muted-foreground">结束日期</Label>
                        </div>
                      </div>
                      
                      {/* 🔧 已删除：日期范围提示文字 */}
                    </div>

                    {/* 🔧 新位置：生成按钮位于日期范围选择器下方 */}
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        disabled={disabled || isGenerating || count <= 0}
                        className="w-full gap-2 h-12"
                        size="lg"
                      >
                        {isGenerating ? (
                          <>
                            <Loader className="h-5 w-5 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Plus className="h-5 w-5" />
                            生成虚拟数据
                          </>
                        )}
                      </Button>

                      {/* 生成进度提示 */}
                      {isGenerating && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            正在生成 {count.toLocaleString()} 条订单数据...
                          </p>
                          {dateRange.startDate && dateRange.endDate && (
                            <p className="text-sm text-muted-foreground">
                              时间范围：{formatDateDisplay(dateRange.startDate)} - {formatDateDisplay(dateRange.endDate)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 右侧信息区域 - 在大屏幕占1列 */}
              <div className="xl:col-span-1 bg-secondary/50 border border-secondary rounded-lg">
                <div className="space-y-4 xl:sticky xl:top-6">
                  {/* 设置摘要 */}
                  {!isGenerating && (
                    <div className="w-full p-4 space-y-3">
                      <h4 className="font-medium text-sm text-foreground">当前设置</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">数据条数</span>
                          <span className="text-xs font-medium text-foreground">{count.toLocaleString()}</span>
                        </div>
                        {dateRange.startDate && dateRange.endDate && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">开始日期</span>
                              <span className="text-xs font-medium text-foreground">{formatDateDisplay(dateRange.startDate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">结束日期</span>
                              <span className="text-xs font-medium text-foreground">{formatDateDisplay(dateRange.endDate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">时间跨度</span>
                              <span className="text-xs font-medium text-foreground">{calculateDaysDiff()} 天</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>输入错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 数据说明 */}
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertTitle>数据字段说明</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <strong className="text-primary">基础信息:</strong>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>订单号：10位唯一哈希值</li>
                  <li>用户ID：10位哈希值（可重复）</li>
                  <li>时间范围：自定义日期区间</li>
                  <li>订单类型：新单、续费</li>
                </ul>
              </div>
              <div>
                <strong className="text-primary">产品信息:</strong>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>5种License：月度/季度/年度订阅 + Credit包</li>
                  <li>3种优惠券：10%、20%、30%折扣</li>
                  <li>支付币种：USD、CNY、EUR</li>
                  <li>支付平台：PayPal、Stripe</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 p-2 bg-muted rounded text-xs">
              <strong>AB测试:</strong> 随机50%用户参与实验组 | 
              <strong className="ml-2">数据质量:</strong> 85%成功订单，15%异常状态 |
              <strong className="ml-2">时间范围:</strong> 支持1-365天自定义区间
            </div>
          </AlertDescription>
        </Alert>

        {/* 性能提示 */}
        {count > 1000 && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>性能提示</AlertTitle>
            <AlertDescription>
              您选择生成 {count.toLocaleString()} 条数据，处理时间可能较长。
              建议首次使用时选择较小的数据量（100-1000条）进行测试。
            </AlertDescription>
          </Alert>
        )}

        {/* 日期范围提示 */}
        {dateRange.startDate && dateRange.endDate && calculateDaysDiff() > 180 && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>日期范围提示</AlertTitle>
            <AlertDescription>
              您选择了 {calculateDaysDiff()} 天的时间范围，较长的时间跨度可能会影响数据生成的多样性。
              建议根据实际分析需求选择合适的时间范围。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}