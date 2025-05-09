#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import traceback

def get_filtered_tree(start_path, exclude_folders=None, indent=0):
    """
    递归获取文件夹结构，类似PowerShell脚本的功能
    """
    if exclude_folders is None:
        exclude_folders = ["node_modules", "model", "__pycache__", ".next", "input", "output", "wsl", "out"]
    
    structure = []
    
    try:
        items = sorted(os.listdir(start_path))
        for item in items:
            if item in exclude_folders:
                continue
                
            path = os.path.join(start_path, item)
            is_dir = os.path.isdir(path)
            
            # 添加当前项目到结构中
            name = item + '/' if is_dir else item
            structure.append((indent, name, is_dir))
            
            # 如果是目录，递归获取子项目
            if is_dir:
                sub_structure = get_filtered_tree(path, exclude_folders, indent + 1)
                structure.extend(sub_structure)
    
    except PermissionError:
        print(f"权限错误: 无法访问 {start_path}")
    except Exception as e:
        print(f"获取文件夹结构时出错: {e}")
    
    return structure

def create_tree_output(structure):
    """生成格式化的树结构输出"""
    if not structure:
        return ""
    
    # 初始化输出
    output = [".", ]
    
    # 跟踪每一级的是否为最后一项
    is_last_at_level = {}
    
    for i, (indent, name, is_dir) in enumerate(structure):
        # 查找下一个同级或更高级别的项目
        next_at_same_level = False
        for next_indent, _, _ in structure[i+1:]:
            if next_indent == indent:
                next_at_same_level = True
                break
            elif next_indent < indent:
                break
        
        # 更新当前级别的最后一项标记
        is_last_at_level[indent] = not next_at_same_level
        
        # 生成前缀
        prefix = ""
        for level in range(indent):
            if level in is_last_at_level and is_last_at_level[level]:
                prefix += "    "
            else:
                prefix += "│   "
        
        # 添加连接符号
        if is_last_at_level[indent]:
            prefix += "└── "
        else:
            prefix += "├── "
        
        # 添加到输出
        output.append(prefix + name)
    
    return "\n".join(output)

def create_indented_structure(structure):
    """创建类似file-structure.txt的缩进格式"""
    if not structure:
        return ""
    
    output = []
    
    for indent, name, _ in structure:
        # 移除目录后的斜杠
        clean_name = name[:-1] if name.endswith('/') else name
        # 添加缩进和名称
        output.append('\t' * indent + clean_name)
    
    return "\n".join(output)

def process_directory(directory_path, exclude_folders=None, output_indent=None, output_tree=None):
    """处理目录并生成两种格式的文件结构"""
    try:
        # 获取文件结构
        structure = get_filtered_tree(directory_path, exclude_folders)
        
        # 生成缩进格式（类似file-structure.txt）
        indented_output = create_indented_structure(structure)
        
        # 生成树形格式（类似formatted-tree.txt）
        tree_output = create_tree_output(structure)
        
        # 保存文件
        if output_indent:
            with open(output_indent, 'w', encoding='utf-8') as f:
                f.write(indented_output)
            print(f"缩进格式的文件结构已保存到: {output_indent}")
            
        if output_tree:
            with open(output_tree, 'w', encoding='utf-8') as f:
                f.write(tree_output)
            print(f"树形格式的文件结构已保存到: {output_tree}")
        
        if not output_indent and not output_tree:
            print("树形格式输出:")
            print(tree_output)
            
    except Exception as e:
        print(f"处理目录时出错: {e}")
        traceback.print_exc()
        return False
    
    return True

def main():
    if len(sys.argv) < 2:
        print("用法: python combined_tree_formatter.py <目录路径> [缩进格式输出文件] [树形格式输出文件]")
        print("例如: python combined_tree_formatter.py . file-structure.txt formatted-tree.txt")
        return False
    
    directory_path = sys.argv[1]
    output_indent = sys.argv[2] if len(sys.argv) > 2 else None
    output_tree = sys.argv[3] if len(sys.argv) > 3 else None
    
    # 默认排除文件夹
    exclude_folders = ["node_modules", "model", "__pycache__", ".next", "input", "output", "wsl", "out", ".DS_Store", ".git", ".gitignore", "venv", "logs", "pids", ".env", ".vscode"]
    
    if not os.path.exists(directory_path):
        print(f"错误: 目录 '{directory_path}' 不存在")
        return False
        
    return process_directory(directory_path, exclude_folders, output_indent, output_tree)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)