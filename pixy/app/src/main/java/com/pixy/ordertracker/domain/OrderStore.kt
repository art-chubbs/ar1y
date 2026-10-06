package com.pixy.ordertracker.domain

import com.pixy.ordertracker.models.Order

/** Persistence used by [OrderManager]; implemented by Room in the app and by a fake in tests. */
interface OrderStore {
    suspend fun activeOrders(): List<Order>
    suspend fun insert(order: Order): Long
    suspend fun update(order: Order)
    /** The most recently finished order from [sourceApp], or null. */
    suspend fun lastFinished(sourceApp: String): Order?
}
