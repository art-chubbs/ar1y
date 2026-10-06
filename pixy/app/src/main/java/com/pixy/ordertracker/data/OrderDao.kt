package com.pixy.ordertracker.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Query("SELECT * FROM orders WHERE isActive = 1 ORDER BY lastUpdatedAt DESC")
    fun observeActive(): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE isActive = 0 ORDER BY COALESCE(completedAt, lastUpdatedAt) DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE id = :id")
    fun observe(id: Long): Flow<OrderEntity?>

    @Query("SELECT * FROM orders WHERE isActive = 1")
    suspend fun active(): List<OrderEntity>

    @Query("SELECT * FROM orders WHERE isActive = 0 AND sourceApp = :sourceApp ORDER BY completedAt DESC LIMIT 1")
    suspend fun lastFinished(sourceApp: String): OrderEntity?

    @Insert
    suspend fun insert(order: OrderEntity): Long

    @Update
    suspend fun update(order: OrderEntity)

    @Query("DELETE FROM orders WHERE isActive = 0")
    suspend fun deleteHistory()

    @Query("DELETE FROM orders")
    suspend fun deleteAll()

    /** Orders created by test mode use notification keys starting with "sim:". */
    @Query("DELETE FROM orders WHERE notificationKey LIKE 'sim:%'")
    suspend fun deleteSimulated()

    /** Keep history bounded: drop finished orders older than [before]. */
    @Query("DELETE FROM orders WHERE isActive = 0 AND lastUpdatedAt < :before")
    suspend fun pruneHistory(before: Long)
}
