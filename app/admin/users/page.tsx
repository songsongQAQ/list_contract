'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Switch, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface User {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // 配置相关状态
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configForm] = Form.useForm();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 检查管理员认证
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 通过 API 检查认证状态（更可靠）
        const res = await fetch('/api/admin/users', {
          method: 'GET',
          credentials: 'include', // 确保发送 cookie
        });
        
        if (res.ok) {
          setAuthenticated(true);
          setCheckingAuth(false);
        } else if (res.status === 401) {
          // 未授权，跳转到登录页
          window.location.href = '/admin/login';
        } else {
          // 其他错误，也跳转到登录页
          window.location.href = '/admin/login';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/admin/login';
      }
    };

    checkAuth();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        credentials: 'include', // 确保发送 cookie
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else if (res.status === 401) {
        // 未授权，跳转到登录页
        message.error('登录已过期，请重新登录');
        window.location.href = '/admin/login';
      } else {
        message.error('获取用户列表失败');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchUsers();
    }
  }, [authenticated]);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      password: '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        message.success('删除成功');
        fetchUsers();
      } else if (res.status === 401) {
        message.error('登录已过期，请重新登录');
        window.location.href = '/admin/login';
      } else {
        const data = await res.json();
        message.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success(editingUser ? '更新成功' : '创建成功');
        setModalVisible(false);
        form.resetFields();
        fetchUsers();
      } else if (res.status === 401) {
        message.error('登录已过期，请重新登录');
        window.location.href = '/admin/login';
      } else {
        const data = await res.json();
        message.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  // 查看用户配置
  const handleViewConfig = async (userId: string) => {
    setCurrentUserId(userId);
    setConfigLoading(true);
    setConfigModalVisible(true);
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/config`);
      if (res.ok) {
        const data = await res.json();
        const config = data.config || {};
        configForm.setFieldsValue({
          // 按照前端顺序设置
          copytradingMode: config.copytradingMode || false,
          copytradingApiKey: config.copytradingApiKey || '',
          copytradingApiSecret: config.copytradingApiSecret || '',
          apiKey: config.apiKey || '',
          apiSecret: config.apiSecret || '',
          longMargin: config.longMargin || '3',
          longLeverage: config.longLeverage || '50',
          shortMargin: config.shortMargin || '3',
          shortLeverage: config.shortLeverage || '50',
          takeProfit: config.takeProfit || '',
          stopLoss: config.stopLoss || '',
          ignoredSymbols: config.ignoredSymbols || '',
          defaultLimit: config.defaultLimit || '10',
        });
      } else if (res.status === 401) {
        message.error('登录已过期，请重新登录');
        setConfigModalVisible(false);
        window.location.href = '/admin/login';
      } else {
        const data = await res.json();
        message.error(data.error || '获取用户配置失败');
        setConfigModalVisible(false);
      }
    } catch (error) {
      console.error('Failed to fetch user config:', error);
      message.error('获取用户配置失败');
      setConfigModalVisible(false);
    } finally {
      setConfigLoading(false);
    }
  };

  // 保存用户配置
  const handleSaveConfig = async () => {
    if (!currentUserId) return;
    
    try {
      const values = await configForm.validateFields();
      const res = await fetch(`/api/admin/users/${currentUserId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success('配置更新成功');
        setConfigModalVisible(false);
        configForm.resetFields();
        setCurrentUserId(null);
      } else if (res.status === 401) {
        message.error('登录已过期，请重新登录');
        setConfigModalVisible(false);
        window.location.href = '/admin/login';
      } else {
        const data = await res.json();
        message.error(data.error || '更新配置失败');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => handleViewConfig(record.id)}
          >
            配置
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 如果正在检查认证，显示加载状态
  if (checkingAuth || !authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证身份...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          创建用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '创建用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        {modalVisible && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: !editingUser, message: '请输入密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password placeholder={editingUser ? '留空则不修改密码' : '请输入密码'} />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 用户配置 Modal */}
      <Modal
        title="用户配置"
        open={configModalVisible}
        onOk={handleSaveConfig}
        onCancel={() => {
          setConfigModalVisible(false);
          configForm.resetFields();
          setCurrentUserId(null);
        }}
        okText="保存"
        cancelText="取消"
        width={800}
        destroyOnHidden
      >
        {configModalVisible && (
          <Form form={configForm} layout="vertical" className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {/* 1. 带单模式设置 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">带单模式设置</h3>
              <Form.Item name="copytradingMode" label="带单模式" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="copytradingApiKey" label="带单 API Key">
                <Input.Password placeholder="请输入带单 API Key" />
              </Form.Item>
              <Form.Item name="copytradingApiSecret" label="带单 API Secret">
                <Input.Password placeholder="请输入带单 API Secret" />
              </Form.Item>
            </div>

            <div className="h-px bg-gray-200" />

            {/* 2. API 密钥配置 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">API 密钥配置</h3>
              <Form.Item name="apiKey" label="Binance API Key">
                <Input.Password placeholder="请输入 API Key" />
              </Form.Item>
              <Form.Item name="apiSecret" label="Binance API Secret">
                <Input.Password placeholder="请输入 API Secret" />
              </Form.Item>
            </div>

            <div className="h-px bg-gray-200" />

            {/* 3. 做多设置 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">做多设置</h3>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="longMargin" label="做多本金 (USDT)">
                  <InputNumber min={0} step={0.1} className="w-full" placeholder="3" />
                </Form.Item>
                <Form.Item name="longLeverage" label="做多杠杆倍数">
                  <InputNumber min={1} max={125} className="w-full" placeholder="50" />
                </Form.Item>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* 4. 做空设置 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">做空设置</h3>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="shortMargin" label="做空本金 (USDT)">
                  <InputNumber min={0} step={0.1} className="w-full" placeholder="3" />
                </Form.Item>
                <Form.Item name="shortLeverage" label="做空杠杆倍数">
                  <InputNumber min={1} max={125} className="w-full" placeholder="50" />
                </Form.Item>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* 5. 止盈止损设置 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">止盈止损设置</h3>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="takeProfit" label="止盈百分比">
                  <InputNumber min={0} step={0.1} className="w-full" placeholder="例如: 100" />
                </Form.Item>
                <Form.Item name="stopLoss" label="止损百分比">
                  <InputNumber min={0} step={0.1} className="w-full" placeholder="例如: 100" />
                </Form.Item>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* 6. 忽略币种 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">忽略币种</h3>
              <Form.Item name="ignoredSymbols" label="忽略的币种列表（空格分隔）">
                <Input.TextArea rows={3} placeholder="例如: BTCUSDT ETHUSDT" />
              </Form.Item>
            </div>

            <div className="h-px bg-gray-200" />

            {/* 7. 默认设置 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">默认设置</h3>
              <Form.Item name="defaultLimit" label="排行榜默认显示数量">
                <InputNumber min={1} max={100} className="w-full" placeholder="10" />
              </Form.Item>
            </div>
          </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}

