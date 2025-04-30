## 背景

因为最近接触obsidian，觉得很适合做长期笔记以及任务管理。

但是任务管理这块，任务到期提示只有 [obsidian-reminder-plugin](https://pkmer.cn/Pkmer-Docs/10-obsidian/obsidian社区插件/obsidian-reminder-plugin/) 插件可以实现提醒。但也仅限于在obsidian中提醒（当然可以设置成系统通知）。但是感觉容易被忽略掉。而且这种提醒在移动端也很难感知到。因此基于 [wxpusher](https://wxpusher.zjiecode.com/docs/#/) 结合obsidian的tasks插件中的due time，搞了个任务到期提醒推送到微信的功能。

## 功能介绍

打开插件：

![image](.\assets\1887c4964d1a0db0f9559ee2ddef19f4a417bcb8_2_690x465.png)



配置插件：（wxpusher的配置信息自行查看wxpusher的文档）
大致步骤是扫码关注公众号，然后在网页创建app得到app_token，然后在公众号里点击我的–>uid获取自己的uid

![image](.\assets\4b4d5c07557e736b714450d4a05b8b799e7907c7_2_690x455.png)



命令行功能：

![image](.\assets\23fb6c3d13f649a0e484580d64016f6b23de58fc_2_690x228.png)





成功推送会在公众号收到消息：

![image](.\assets\ead27b651b52f054940fe9eeb9f6503f3f46fcec_2_476x500.png)

消息点开详情是task的信息：

![image](.\assets\0c159254a31cf4dc2c9c8d4e26aab2fcbd218066_2_690x233.png)







## 特别鸣谢

 [obsidian](https://obsidian.md/) ：强无敌

 [wxpusher](https://wxpusher.zjiecode.com/docs/#/) ：微信推送~

