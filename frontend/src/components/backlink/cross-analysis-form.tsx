// frontend-new/src/components/backlink/cross-analysis-form.tsx
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Upload, ArrowDownUp } from 'lucide-react';

interface CrossAnalysisFormProps {
  onSubmitFirstRound: (files: File[]) => Promise<void>;
  onSubmitSecondRound: (files: File[]) => Promise<void>;
  isLoadingFirstRound: boolean;
  isLoadingSecondRound: boolean;
  firstRoundComplete: boolean;
  secondRoundComplete: boolean;
  onReset: () => void;
}

export function CrossAnalysisForm({
  onSubmitFirstRound,
  onSubmitSecondRound,
  isLoadingFirstRound,
  isLoadingSecondRound,
  firstRoundComplete,
  secondRoundComplete,
  onReset
}: CrossAnalysisFormProps) {
  const [showFirstRound, setShowFirstRound] = useState(true);
  const [showSecondRound, setShowSecondRound] = useState(false);

  const handleFirstRoundSubmit = async (files: File[]) => {
    if (files.length === 0) return;
    
    try {
      await onSubmitFirstRound(files);
      setShowFirstRound(false);
      setShowSecondRound(true);
    } catch (error) {
      console.error('Error processing first round files:', error);
    }
  };

  const handleSecondRoundSubmit = async (files: File[]) => {
    if (files.length === 0) return;
    
    try {
      await onSubmitSecondRound(files);
      setShowSecondRound(false);
    } catch (error) {
      console.error('Error processing second round files:', error);
    }
  };

  const handleReset = () => {
    onReset();
    setShowFirstRound(true);
    setShowSecondRound(false);
  };

  return (
    <div className="space-y-6">
      {/* 第一轮上传 */}
      {showFirstRound && (
        <Card>
          <CardHeader>
            <CardTitle>第一步：上传域名数据文件</CardTitle>
            <CardDescription>
              上传包含Domain和Domain ascore字段的CSV或XLSX文件。系统将提取域名信息用于后续分析。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesSelected={handleFirstRoundSubmit}
              disabled={isLoadingFirstRound}
            />
          </CardContent>
          {isLoadingFirstRound && (
            <Alert className="m-4">
              <AlertDescription>
                正在处理文件，请稍候...
              </AlertDescription>
            </Alert>
          )}
        </Card>
      )}

      {/* 第一轮和第二轮之间的过渡 */}
      {firstRoundComplete && showSecondRound && (
        <>
          <div className="flex justify-center items-center py-4">
            <ArrowDownUp className="mx-2 text-primary" />
            <span className="text-sm text-muted-foreground">准备处理第二轮数据</span>
          </div>
          <Separator className="my-2" />
        </>
      )}

      {/* 第二轮上传 */}
      {showSecondRound && (
        <Card>
          <CardHeader>
            <CardTitle>第二步：上传链接数据文件</CardTitle>
            <CardDescription>
              上传包含Source url、Target url等字段的CSV或XLSX文件。系统将与第一步上传的域名数据进行交叉分析。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesSelected={handleSecondRoundSubmit}
              disabled={isLoadingSecondRound}
            />
          </CardContent>
          {isLoadingSecondRound && (
            <Alert className="w-xl m-auto justify-center">
              <AlertDescription>
                正在处理文件并进行交叉分析，请稍候...
              </AlertDescription>
            </Alert>
          )}
        </Card>
      )}

      {/* 重新上传按钮 */}
      {(firstRoundComplete && !showFirstRound && !showSecondRound) && (
        <div className="flex justify-center">
          <Button onClick={handleReset} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            重新上传文件
          </Button>
        </div>
      )}
    </div>
  );
}