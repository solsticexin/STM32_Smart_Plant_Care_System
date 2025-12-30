// 原理说明：该实现文件给出 Wi-Fi 等静态配置字符串，避免将敏感信息散落在业务代码中。
#include "device_config.h"

namespace device_config {

// Configure the credentials for the access point hosted by the ESP module.
const char WIFI_SSID[] = "智能盆栽养护检测系统";
const char WIFI_PASSWORD[] = "12345678";

}  // namespace device_config
