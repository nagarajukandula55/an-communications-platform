package com.an.acp.gateway.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface OutboxDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: OutboxMessage)

    @Update
    suspend fun update(message: OutboxMessage)

    @Query("SELECT * FROM outbox_messages WHERE status = 'PENDING' ORDER BY createdAt ASC")
    suspend fun pending(): List<OutboxMessage>

    @Query("SELECT * FROM outbox_messages ORDER BY createdAt DESC LIMIT 100")
    fun recent(): Flow<List<OutboxMessage>>
}
