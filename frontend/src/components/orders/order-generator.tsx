//frontend/src/components/orders/order-generator.tsx
"use client";

import React, { useState } from 'react';
import { Plus, Loader, Database, AlertCircle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface OrderGeneratorProps {
  onGenerate: (count: number) => Promise<void>;
  isGenerating: boolean;
  disabled?: boolean;
}

export function OrderGenerator({
  onGenerate,
  isGenerating,
  disabled = false,
}: OrderGeneratorProps) {
  const [count, setCount] = useState<number>(100);
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

    try {
      await onGenerate(count);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          虚拟订单数据生成器
        </CardTitle>
        <CardDescription>
          生成指定数量的虚拟订单数据用于分析。数据包含订单号、用户ID、产品信息、支付信息等完整字段。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左侧：输入区域 */}
            <div className="space-y-4">
              <div className="space-y-2">
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
            
            {/* 右侧：操作按钮 */}
            <div className="flex flex-col justify-center">
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
                <p className="text-xs text-muted-foreground text-center mt-2">
                  正在生成 {count.toLocaleString()} 条订单数据...
                </p>
              )}
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
                  <li>时间范围：2025年4月-5月</li>
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
              <strong className="ml-2">数据质量:</strong> 85%成功订单，15%异常状态
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
      </CardContent>
    </Card>
  );
}