package com.pixy.ordertracker.data

import com.pixy.ordertracker.domain.OrderStore
import com.pixy.ordertracker.models.Order
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** On-device order storage. Nothing here ever leaves the phone. */
class OrderRepository(private val dao: OrderDao) : OrderStore {
    val activeOrders: Flow<List<Order>> = dao.observeActive().map { list -> list.map { it.toModel() } }
    fun recentOrders(limit: Int = 30): Flow<List<Order>> = dao.observeRecent(limit).map { list -> list.map { it.toModel() } }
    fun order(id: Long): Flow<Order?> = dao.observe(id).map { it?.toModel() }

    override suspend fun activeOrders(): List<Order> = dao.active().map { it.toModel() }
    override suspend fun insert(order: Order): Long = dao.insert(OrderEntity.from(order))
    override suspend fun update(order: Order) = dao.update(OrderEntity.from(order))
    override suspend fun lastFinished(sourceApp: String): Order? = dao.lastFinished(sourceApp)?.toModel()

    suspend fun clearHistory() = dao.deleteHistory()
    suspend fun clearAll() = dao.deleteAll()
    suspend fun clearSimulated() = dao.deleteSimulated()
    suspend fun prune(now: Long) = dao.pruneHistory(now - 30L * 24 * 60 * 60 * 1000)
}
