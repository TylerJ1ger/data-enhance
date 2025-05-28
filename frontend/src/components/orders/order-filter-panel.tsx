//frontend/src/components/orders/order-filter-panel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LICENSE_MAPPINGS } from '@/types/index';
import type { OrderFilterRanges, OrderFilterRequest } from '@/types/index';

interface OrderFilterPanelProps {
  filterRanges: OrderFilterRanges | null;
  onApplyFilter: (filters: OrderFilterRequest) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// 工具函数：将日期时间字符串转换为日期字符串
const formatDateForInput = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  // 如果已经是 YYYY-MM-DD 格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTimeString)) {
    return dateTimeString;
  }
  // 如果是 YYYY-MM-DD HH:MM:SS 格式，截取日期部分
  return dateTimeString.split(' ')[0];
};

export function OrderFilterPanel({
  filterRanges,
  onApplyFilter,
  isLoading = false,
  disabled = false,
}: OrderFilterPanelProps) {
  // 筛选状态
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [orderTypes, setOrderTypes] = useState<string[]>([]);
  const [licenseIds, setLicenseIds] = useState<number[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [paymentPlatforms, setPaymentPlatforms] = useState<string[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<string[]>([]);
  const [salesAmountRange, setSalesAmountRange] = useState<[number, number] | null>(null);
  const [hasCoupon, setHasCoupon] = useState<boolean | null>(null);
  const [abTestFilter, setAbTestFilter] = useState<"with" | "without" | null>(null);

  // 初始化筛选范围 - 修复日期格式问题
  useEffect(() => {
    if (filterRanges && !isLoading) {
      // 处理日期格式转换
      const minDate = formatDateForInput(filterRanges.date_range.min);
      const maxDate = formatDateForInput(filterRanges.date_range.max);
      
      setDateRange([minDate, maxDate]);
      setSalesAmountRange([filterRanges.sales_amount_range.min, filterRanges.sales_amount_range.max]);
    }
  }, [filterRanges, isLoading]);

  const handleApplyFilter = () => {
    const filters: OrderFilterRequest = {
      date_range: dateRange,
      order_types: orderTypes.length > 0 ? orderTypes : null,
      license_ids: licenseIds.length > 0 ? licenseIds : null,
      currencies: currencies.length > 0 ? currencies : null,
      payment_platforms: paymentPlatforms.length > 0 ? paymentPlatforms : null,
      order_statuses: orderStatuses.length > 0 ? orderStatuses : null,
      sales_amount_range: salesAmountRange,
      has_coupon: hasCoupon,
      ab_test_filter: abTestFilter,
    };

    onApplyFilter(filters);
  };

  const handleReset = () => {
    if (filterRanges) {
      const minDate = formatDateForInput(filterRanges.date_range.min);
      const maxDate = formatDateForInput(filterRanges.date_range.max);
      setDateRange([minDate, maxDate]);
      setSalesAmountRange([filterRanges.sales_amount_range.min, filterRanges.sales_amount_range.max]);
    }
    setOrderTypes([]);
    setLicenseIds([]);
    setCurrencies([]);
    setPaymentPlatforms([]);
    setOrderStatuses([]);
    setHasCoupon(null);
    setAbTestFilter(null);
  };

  if (isLoading || !filterRanges) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 复选框组件
  const CheckboxGroup = ({
    title,
    options,
    selectedValues,
    onSelectionChange,
    getDisplayName,
    maxHeight = "max-h-32",
  }: {
    title: string;
    options: any[];
    selectedValues: any[];
    onSelectionChange: (values: any[]) => void;
    getDisplayName?: (value: any) => string;
    maxHeight?: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center justify-between">
        {title}
        {selectedValues.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedValues.length} 选中
          </Badge>
        )}
      </Label>
      <ScrollArea className={`${maxHeight} overflow-y-auto border rounded-md p-2`}>
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${title}-${option}`}
                checked={selectedValues.includes(option)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectionChange([...selectedValues, option]);
                  } else {
                    onSelectionChange(selectedValues.filter((v) => v !== option));
                  }
                }}
                disabled={disabled}
              />
              <Label 
                htmlFor={`${title}-${option}`} 
                className="text-sm cursor-pointer flex-1 leading-none"
              >
                {getDisplayName ? getDisplayName(option) : option}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          筛选条件
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 日期范围 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">日期范围</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                开始日期
              </Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange?.[0] || ''}
                onChange={(e) => setDateRange(prev => [e.target.value, prev?.[1] || ''])}
                disabled={disabled}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                结束日期
              </Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange?.[1] || ''}
                onChange={(e) => setDateRange(prev => [prev?.[0] || '', e.target.value])}
                disabled={disabled}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 订单类型 */}
        <CheckboxGroup
          title="订单类型"
          options={filterRanges.available_options.order_types}
          selectedValues={orderTypes}
          onSelectionChange={setOrderTypes}
        />

        <Separator />

        {/* License类型 */}
        <CheckboxGroup
          title="License类型"
          options={filterRanges.available_options.license_ids}
          selectedValues={licenseIds}
          onSelectionChange={setLicenseIds}
          getDisplayName={(id) => {
            const license = LICENSE_MAPPINGS[id as keyof typeof LICENSE_MAPPINGS];
            return license ? `${license.name} ($${license.price})` : `License ${id}`;
          }}
          maxHeight="max-h-40"
        />

        <Separator />

        {/* 销售总额范围 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            销售总额范围
          </Label>
          <div className="px-2">
            <Slider
              value={salesAmountRange || [0, 100]}
              onValueChange={(value) => setSalesAmountRange([value[0], value[1]])}
              min={filterRanges.sales_amount_range.min}
              max={filterRanges.sales_amount_range.max}
              step={0.01}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>${salesAmountRange?.[0]?.toFixed(2) || '0.00'}</span>
              <span>${salesAmountRange?.[1]?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* 币种 */}
        <CheckboxGroup
          title="支付币种"
          options={filterRanges.available_options.currencies}
          selectedValues={currencies}
          onSelectionChange={setCurrencies}
          getDisplayName={(currency) => currency.toUpperCase()}
        />

        <Separator />

        {/* 支付平台 */}
        <CheckboxGroup
          title="支付平台"
          options={filterRanges.available_options.payment_platforms}
          selectedValues={paymentPlatforms}
          onSelectionChange={setPaymentPlatforms}
          getDisplayName={(platform) => platform.charAt(0).toUpperCase() + platform.slice(1)}
        />

        <Separator />

        {/* 订单状态 */}
        <CheckboxGroup
          title="订单状态"
          options={filterRanges.available_options.order_statuses}
          selectedValues={orderStatuses}
          onSelectionChange={setOrderStatuses}
        />

        <Separator />

        {/* 优惠券筛选 - 修复空值问题 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">优惠券使用</Label>
          <Select 
            value={hasCoupon === null ? "__all__" : hasCoupon.toString()} 
            onValueChange={(value) => {
              if (value === "__all__") setHasCoupon(null);
              else setHasCoupon(value === "true");
            }}
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder="选择优惠券筛选条件" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem value="true">有优惠券</SelectItem>
              <SelectItem value="false">无优惠券</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* AB测试筛选 - 修复空值问题 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">AB测试参与</Label>
          <Select 
            value={abTestFilter || "__all__"} 
            onValueChange={(value) => {
              setAbTestFilter(value === "__all__" ? null : value as "with" | "without");
            }}
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder="选择AB测试筛选条件" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem value="with">参与AB测试</SelectItem>
              <SelectItem value="without">未参与AB测试</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleApplyFilter} 
            disabled={disabled || isLoading}
            className="flex-1"
          >
            <Filter className="h-4 w-4 mr-2" />
            应用筛选
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={disabled || isLoading}
            size="icon"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 当前筛选状态摘要 */}
        {(orderTypes.length > 0 || licenseIds.length > 0 || currencies.length > 0 || 
          paymentPlatforms.length > 0 || orderStatuses.length > 0 || 
          hasCoupon !== null || abTestFilter !== null) && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              当前筛选条件:
            </Label>
            <div className="flex flex-wrap gap-1">
              {orderTypes.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
              {licenseIds.map(id => (
                <Badge key={id} variant="secondary" className="text-xs">
                  License {id}
                </Badge>
              ))}
              {currencies.map(currency => (
                <Badge key={currency} variant="secondary" className="text-xs">
                  {currency.toUpperCase()}
                </Badge>
              ))}
              {paymentPlatforms.map(platform => (
                <Badge key={platform} variant="secondary" className="text-xs">
                  {platform}
                </Badge>
              ))}
              {orderStatuses.map(status => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {status}
                </Badge>
              ))}
              {hasCoupon !== null && (
                <Badge variant="secondary" className="text-xs">
                  {hasCoupon ? '有优惠券' : '无优惠券'}
                </Badge>
              )}
              {abTestFilter && (
                <Badge variant="secondary" className="text-xs">
                  {abTestFilter === 'with' ? '参与AB测试' : '未参与AB测试'}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}