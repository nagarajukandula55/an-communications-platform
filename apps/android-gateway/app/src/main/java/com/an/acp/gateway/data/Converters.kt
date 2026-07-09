package com.an.acp.gateway.data

import androidx.room.TypeConverter

class Converters {
    @TypeConverter
    fun fromStatus(status: OutboxStatus): String = status.name

    @TypeConverter
    fun toStatus(value: String): OutboxStatus = OutboxStatus.valueOf(value)
}
