CREATE DATABASE PudongMedicalDB;
GO

USE PudongMedicalDB;
GO

-- 表1：medical_point 医疗点位主表
CREATE TABLE medical_point(
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,        --点位名称
    type NVARCHAR(50) NOT NULL,         --类型：医院/社区卫生中心/急救站/药店
    address NVARCHAR(300),              --地址
    lng DECIMAL(12,8) NOT NULL,         --经度
    lat DECIMAL(12,8) NOT NULL,         --纬度
    phone NVARCHAR(50),                 --联系电话
    level NVARCHAR(50),                 --等级（一级医院、二级医院等）
    create_time DATETIME DEFAULT GETDATE()
);
GO

--表2：sys_user 用户账号表
CREATE TABLE sys_user(
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE, --账号
    password NVARCHAR(100) NOT NULL,       --密码（建议前端/后端md5加密存储）
    real_name NVARCHAR(50),
    role NVARCHAR(20) DEFAULT 'user',       -- user普通用户 / admin管理员
    create_time DATETIME DEFAULT GETDATE()
);
GO

--表3：user_collect 用户收藏表
CREATE TABLE user_collect(
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    point_id INT NOT NULL,
    create_time DATETIME DEFAULT GETDATE(),
    FOREIGN KEY(user_id) REFERENCES sys_user(id),
    FOREIGN KEY(point_id) REFERENCES medical_point(id),
    --同一个用户不能重复收藏同一个点位
    CONSTRAINT uk_user_point UNIQUE(user_id,point_id)
);
GO

--表4：point_comment 点位留言+星级评分
CREATE TABLE point_comment(
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    point_id INT NOT NULL,
    star TINYINT CHECK(star>=1 AND star<=5), --1‑5星评分
    content NVARCHAR(1000),                 --留言内容
    create_time DATETIME DEFAULT GETDATE(),
    FOREIGN KEY(user_id) REFERENCES sys_user(id),
    FOREIGN KEY(point_id) REFERENCES medical_point(id)
);
GO

--表5：system_notice 系统公告
CREATE TABLE system_notice(
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    content NVARCHAR(2000),
    publish_user INT,          --发布管理员id
    is_show TINYINT DEFAULT 1, -- 1显示 0隐藏
    create_time DATETIME DEFAULT GETDATE(),
    FOREIGN KEY(publish_user) REFERENCES sys_user(id)
);
GO

--表6：site_evaluation 选址评估历史记录表
CREATE TABLE site_evaluation(
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    eval_name NVARCHAR(100),       --选址名称
    lng DECIMAL(12,8),
    lat DECIMAL(12,8),
    resultJson NVARCHAR(MAX),     --选址评估json结果字符串
    create_time DATETIME DEFAULT GETDATE(),
    FOREIGN KEY(user_id) REFERENCES sys_user(id)
);
GO

--表7：search_record 用户查询历史记录表
CREATE TABLE search_record(
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    search_text NVARCHAR(200),        --搜索文字
    param_json NVARCHAR(MAX),         --查询参数json字符串
    create_time DATETIME DEFAULT GETDATE(),
    FOREIGN KEY(user_id) REFERENCES sys_user(id)
);
GO
